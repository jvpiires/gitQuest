import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@gitquest/database";
import { NextResponse } from "next/server";
import {
  createInternalSessionToken,
  getAuthMode,
  setInternalSessionCookie,
} from "../../../_lib/session";

const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ALLOW_OFFLINE_USERNAME_LOGIN =
  process.env.ALLOW_OFFLINE_USERNAME_LOGIN !== "false";

interface GitlabUser {
  id: number;
  username?: string;
  name?: string;
  state?: string;
}

interface LoginBody {
  username?: string;
  next?: string;
}

interface LocalUserResolution {
  userId: string;
  usernameNotFound: boolean;
}

function trimTrailingSlashes(value: string): string {
  let result = value;
  while (result.endsWith("/")) {
    result = result.slice(0, -1);
  }
  return result;
}

function resolveGitlabApiUrl(): string {
  const explicit = process.env.GITLAB_API_URL?.trim();
  if (explicit) return trimTrailingSlashes(explicit);

  const oauthBase = process.env.GITLAB_OAUTH_BASE_URL?.trim();
  if (oauthBase) {
    return `${trimTrailingSlashes(oauthBase)}/api/v4`;
  }

  return "http://git.sad.infovia-mt/api/v4"; // NOSONAR
}

function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

function isSafeNextPath(next: string): boolean {
  return next.startsWith("/") && !next.startsWith("//");
}

async function resolveGitlabUser(username: string): Promise<GitlabUser | null> {
  const headers = new Headers();
  const token = process.env.GITLAB_TOKEN?.trim();
  if (token) {
    headers.set("PRIVATE-TOKEN", token);
  }

  const apiUrl = resolveGitlabApiUrl();
  let exactRes: Response;
  try {
    exactRes = await fetch(`${apiUrl}/users?username=${encodeURIComponent(username)}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new Error(
      `Não foi possível conectar ao GitLab interno (${apiUrl}). Confira GITLAB_API_URL e acesso de rede do servidor.`,
    );
  }

  if (!exactRes.ok) {
    throw new Error(`Falha ao consultar usuário no GitLab (HTTP ${exactRes.status}).`);
  }

  const exactUsers = (await exactRes.json()) as GitlabUser[];
  if (Array.isArray(exactUsers) && exactUsers.length > 0) {
    return exactUsers[0];
  }

  let searchRes: Response;
  try {
    searchRes = await fetch(`${apiUrl}/users?search=${encodeURIComponent(username)}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new Error(
      `Não foi possível conectar ao GitLab interno (${apiUrl}). Confira GITLAB_API_URL e acesso de rede do servidor.`,
    );
  }

  if (!searchRes.ok) {
    throw new Error(`Falha na busca de usuário no GitLab (HTTP ${searchRes.status}).`);
  }

  const searchedUsers = (await searchRes.json()) as GitlabUser[];
  const found = searchedUsers.find(
    (candidate) => candidate.username?.toLowerCase() === username,
  );

  return found ?? null;
}

async function findExistingUserId(username: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("gitlab_username", username)
    .maybeSingle();

  return data?.id ?? null;
}

async function canCreateUserFromGitlab(username: string): Promise<boolean> {
  try {
    const gitlabUser = await resolveGitlabUser(username);
    return Boolean(gitlabUser?.username);
  } catch (gitlabError) {
    if (!ALLOW_OFFLINE_USERNAME_LOGIN) {
      throw gitlabError;
    }

    console.warn(
      `Login por username sem validação no GitLab para ${username}. ` +
        "Habilitado por ALLOW_OFFLINE_USERNAME_LOGIN.",
      gitlabError,
    );
    return true;
  }
}

async function createLocalUser(username: string): Promise<string> {
  const userId = randomUUID();
  const { error: insertError } = await supabaseAdmin.from("users").insert({
    id: userId,
    gitlab_username: username,
    current_level: 1,
    total_xp: 0,
  });

  if (insertError) {
    throw new Error("Não foi possível criar/vincular o usuário local.");
  }

  return userId;
}

async function resolveOrCreateLocalUser(username: string): Promise<LocalUserResolution> {
  const existingUserId = await findExistingUserId(username);
  if (existingUserId) {
    return {
      userId: existingUserId,
      usernameNotFound: false,
    };
  }

  const canCreate = await canCreateUserFromGitlab(username);
  if (!canCreate) {
    return {
      userId: "",
      usernameNotFound: true,
    };
  }

  return {
    userId: await createLocalUser(username),
    usernameNotFound: false,
  };
}

export async function POST(request: Request) {
  if (getAuthMode() !== "internal_gitlab") {
    return NextResponse.json(
      { error: "Rota disponível apenas no modo internal_gitlab." },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json()) as LoginBody;
    const normalizedUsername = normalizeUsername(body.username ?? "");

    if (!normalizedUsername) {
      return NextResponse.json({ error: "username é obrigatório." }, { status: 400 });
    }

    const username = normalizedUsername;
    const resolvedUser = await resolveOrCreateLocalUser(username);
    if (resolvedUser.usernameNotFound) {
      return NextResponse.json(
        { error: "Usuário não encontrado no GitLab interno." },
        { status: 404 },
      );
    }
    const userId = resolvedUser.userId;

    const sessionToken = createInternalSessionToken(userId, username);
    const nextPath = isSafeNextPath(body.next ?? "") ? (body.next as string) : "/";

    const response = NextResponse.json({
      ok: true,
      user: {
        id: userId,
        gitlab_username: username,
      },
      nextPath,
    });
    setInternalSessionCookie(response, sessionToken);
    return response;
  } catch (error) {
    console.error("Erro no login por username GitLab:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao autenticar por username.",
      },
      { status: 500 },
    );
  }
}
