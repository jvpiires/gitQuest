import { NextResponse } from "next/server";
import {
  clearInternalSessionCookie,
  clearOAuthStateCookie,
} from "../../_lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearInternalSessionCookie(response);
  clearOAuthStateCookie(response);
  return response;
}
