import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createOAuthStateToken, setOAuthStateCookie } from "../../../_lib/session";

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

export async function GET(request: Request) {
  try {
    const gitlabClientId = process.env.GITLAB_OAUTH_CLIENT_ID;
    if (!gitlabClientId) {
      return NextResponse.json(
        { error: "GITLAB_OAUTH_CLIENT_ID não configurado." },
        { status: 500 },
      );
    }

    const requestUrl = new URL(request.url);
    const nextPath = requestUrl.searchParams.get("next") || "/";
    const state = randomBytes(16).toString("hex");

    const origin = requestUrl.origin;
    const redirectUri =
      process.env.GITLAB_OAUTH_REDIRECT_URI?.trim() ||
      `${origin}/api/auth/gitlab/callback`;

    const oauthStateToken = createOAuthStateToken(state, nextPath);

    const authorizeUrl = new URL(`${resolveGitlabBaseUrl()}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", gitlabClientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set(
      "scope",
      process.env.GITLAB_OAUTH_SCOPE?.trim() || "read_user",
    );
    authorizeUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authorizeUrl);
    setOAuthStateCookie(response, oauthStateToken);
    return response;
  } catch (error) {
    console.error("Erro ao iniciar OAuth interno GitLab:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
