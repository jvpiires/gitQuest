import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@gitquest/database";
import { NextResponse } from "next/server";
import {
  clearOAuthStateCookie,
  createInternalSessionToken,
  readOAuthState,
  setInternalSessionCookie,
} from "../../../_lib/session";

const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface GitlabTokenResponse {
  access_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GitlabUserResponse {
  username?: string;
  name?: string;
}

function trimTrailingSlashes(value: string): string {
  let result = value;
  while (result.endsWith("/")) {
    result = result.slice(0, -1);
  }
  return result;
}

function resolveGitlabBaseUrl(): string {
  const explicit = process.env.GITLAB_OAUTH_BASE_URL?.trim();
  if (explicit) return trimTrailingSlashes(explicit);

  const apiUrl = process.env.GITLAB_API_URL?.trim();
  if (apiUrl) {
    const cleaned = trimTrailingSlashes(apiUrl);
    if (cleaned.endsWith("/api/v4")) {
      return cleaned.slice(0, -"/api/v4".length);
    }
    return cleaned;
  }

  return "http://git.sad.infovia-mt"; // NOSONAR
}

function resolveGitlabApiUrl(): string {
  const explicit = process.env.GITLAB_API_URL?.trim();
  if (explicit) return trimTrailingSlashes(explicit);

  return `${resolveGitlabBaseUrl()}/api/v4`;
}

function redirectToLoginWithError(
  requestUrl: URL,
  error: string,
  description: string,
): NextResponse {
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("authError", error);
  loginUrl.searchParams.set("authErrorDescription", description);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  try {
    const code = requestUrl.searchParams.get("code");
    const state = requestUrl.searchParams.get("state");

    if (!code || !state) {
      return redirectToLoginWithError(
        requestUrl,
        "missing_code_or_state",
        "Callback OAuth inválido.",
      );
    }

    const oauthState = readOAuthState(request);
    if (oauthState?.state !== state) {
      return redirectToLoginWithError(
        requestUrl,
        "invalid_oauth_state",
        "State OAuth inválido ou expirado.",
      );
    }

    const gitlabClientId = process.env.GITLAB_OAUTH_CLIENT_ID;
    const gitlabClientSecret = process.env.GITLAB_OAUTH_CLIENT_SECRET;
    if (!gitlabClientId || !gitlabClientSecret) {
      return redirectToLoginWithError(
        requestUrl,
        "oauth_client_not_configured",
        "Client OAuth GitLab não configurado no servidor.",
      );
    }

    const redirectUri =
      process.env.GITLAB_OAUTH_REDIRECT_URI?.trim() ||
      `${requestUrl.origin}/api/auth/gitlab/callback`;

    const tokenRes = await fetch(`${resolveGitlabBaseUrl()}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: gitlabClientId,
        client_secret: gitlabClientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }).toString(),
      signal: AbortSignal.timeout(10000),
    });

    const tokenData = (await tokenRes.json()) as GitlabTokenResponse;
    if (!tokenRes.ok || !tokenData.access_token) {
      return redirectToLoginWithError(
        requestUrl,
        tokenData.error || "oauth_token_exchange_failed",
        tokenData.error_description ||
          `Falha ao trocar code por token (HTTP ${tokenRes.status}).`,
      );
    }

    const userRes = await fetch(`${resolveGitlabApiUrl()}/user`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    const gitlabUser = (await userRes.json()) as GitlabUserResponse;
    if (!userRes.ok || !gitlabUser.username) {
      return redirectToLoginWithError(
        requestUrl,
        "gitlab_user_fetch_failed",
        `Falha ao consultar usuário no GitLab (HTTP ${userRes.status}).`,
      );
    }

    const normalizedUsername = gitlabUser.username.trim().toLowerCase();

    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, gitlab_username")
      .eq("gitlab_username", normalizedUsername)
      .maybeSingle();

    const userId = existingUser?.id ?? randomUUID();
    const { error: upsertError } = await supabaseAdmin.from("users").upsert(
      {
        id: userId,
        gitlab_username: normalizedUsername,
        current_level: existingUser ? undefined : 1,
        total_xp: existingUser ? undefined : 0,
      },
      { onConflict: "id" },
    );

    if (upsertError) {
      return redirectToLoginWithError(
        requestUrl,
        "user_upsert_failed",
        "Não foi possível sincronizar o usuário local.",
      );
    }

    const sessionToken = createInternalSessionToken(userId, normalizedUsername);
    const destination = oauthState.next || "/";
    const response = NextResponse.redirect(new URL(destination, requestUrl.origin));
    setInternalSessionCookie(response, sessionToken);
    clearOAuthStateCookie(response);
    return response;
  } catch (error) {
    console.error("Erro no callback OAuth interno GitLab:", error);
    return redirectToLoginWithError(
      requestUrl,
      "oauth_callback_exception",
      error instanceof Error ? error.message : "Erro inesperado no callback OAuth.",
    );
  }
}
