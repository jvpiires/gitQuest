import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

export type AuthMode = "supabase" | "internal_gitlab";

const SESSION_COOKIE_NAME = "gq_session";
const OAUTH_STATE_COOKIE_NAME = "gq_oauth_state";
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 12);
const OAUTH_STATE_TTL_SECONDS = 5 * 60;

function base64UrlEncode(value: Buffer | string): string {
  let encoded = Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_");

  while (encoded.endsWith("=")) {
    encoded = encoded.slice(0, -1);
  }

  return encoded;
}

function base64UrlDecode(value: string): string {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET não configurado em produção.");
  }

  return "gitquest-dev-session-secret";
}

function signPayload(payloadB64: string): string {
  return base64UrlEncode(
    createHmac("sha256", getSessionSecret()).update(payloadB64).digest(),
  );
}

function createSignedToken(payload: object): string {
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

function verifySignedToken(token: string): Record<string, unknown> | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSignature = signPayload(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(payloadB64)) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const parsed: Record<string, string> = {};

  cookieHeader.split(";").forEach((part) => {
    const [rawName, ...rest] = part.trim().split("=");
    if (!rawName || rest.length === 0) return;
    parsed[rawName] = decodeURIComponent(rest.join("="));
  });

  return parsed;
}

export interface InternalSession {
  sub: string;
  gitlabUsername: string;
  role: "admin" | "player";
  iat: number;
  exp: number;
  sid: string;
}

interface OAuthStatePayload {
  state: string;
  next: string;
  exp: number;
}

export function getAuthMode(): AuthMode {
  const configured = process.env.AUTH_MODE;
  return configured === "internal_gitlab" ? "internal_gitlab" : "supabase";
}

export function createInternalSessionToken(
  userId: string,
  gitlabUsername: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: InternalSession = {
    sub: userId,
    gitlabUsername,
    role: gitlabUsername.toLowerCase() === "joao.santos" ? "admin" : "player",
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    sid: randomBytes(12).toString("hex"),
  };

  return createSignedToken(payload);
}

export function readInternalSession(request: Request): InternalSession | null {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;

  const decoded = verifySignedToken(token);
  if (!decoded) return null;

  const sub = decoded.sub;
  const gitlabUsername = decoded.gitlabUsername;
  const role = decoded.role;
  const exp = decoded.exp;
  const iat = decoded.iat;
  const sid = decoded.sid;

  if (
    typeof sub !== "string" ||
    typeof gitlabUsername !== "string" ||
    (role !== "admin" && role !== "player") ||
    typeof exp !== "number" ||
    typeof iat !== "number" ||
    typeof sid !== "string"
  ) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (exp <= now) return null;

  return {
    sub,
    gitlabUsername,
    role,
    exp,
    iat,
    sid,
  };
}

export function createOAuthStateToken(state: string, nextPath: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: OAuthStatePayload = {
    state,
    next: nextPath,
    exp: now + OAUTH_STATE_TTL_SECONDS,
  };

  return createSignedToken(payload);
}

export function readOAuthState(request: Request): OAuthStatePayload | null {
  const cookies = parseCookies(request);
  const token = cookies[OAUTH_STATE_COOKIE_NAME];
  if (!token) return null;

  const decoded = verifySignedToken(token);
  if (!decoded) return null;

  const state = decoded.state;
  const next = decoded.next;
  const exp = decoded.exp;
  if (typeof state !== "string" || typeof next !== "string" || typeof exp !== "number") {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (exp <= now) return null;

  return { state, next, exp };
}

export function setInternalSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearInternalSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function setOAuthStateCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: OAUTH_STATE_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });
}

export function clearOAuthStateCookie(response: NextResponse): void {
  response.cookies.set({
    name: OAUTH_STATE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
