import { getAuthMode, readInternalSession } from "./session";

interface AuthResolutionOk {
  ok: true;
  userId: string;
}

interface AuthResolutionErr {
  ok: false;
  status: number;
  error: string;
}

export type AuthResolution = AuthResolutionOk | AuthResolutionErr;

export function resolveGameRouteUserId(
  request: Request,
  bodyUserId?: string,
): AuthResolution {
  if (getAuthMode() === "internal_gitlab") {
    const session = readInternalSession(request);
    if (!session) {
      return { ok: false, status: 401, error: "Não autenticado." };
    }

    return { ok: true, userId: session.sub };
  }

  if (!bodyUserId) {
    return { ok: false, status: 400, error: "userId é obrigatório." };
  }

  return { ok: true, userId: bodyUserId };
}
