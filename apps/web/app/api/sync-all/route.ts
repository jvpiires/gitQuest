import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@gitquest/database";
import { syncGithubXpForUser } from "../_lib/github-sync";

function hasValidSecret(request: Request): boolean {
  const requiredSecret = process.env.SYNC_SECRET;
  if (!requiredSecret) return true;

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const syncHeader = request.headers.get("x-sync-secret");

  return bearer === requiredSecret || syncHeader === requiredSecret;
}

async function runSyncAll() {
  const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, github_username")
    .not("github_username", "is", null)
    .order("created_at", { ascending: true })
    .limit(250);

  if (error) throw new Error(error.message);

  const synced: Array<{ userId: string; githubUsername: string; totalXp: number; xpDelta: number }> = [];
  const failed: Array<{ userId: string; reason: string }> = [];

  for (const profile of profiles || []) {
    try {
      const result = await syncGithubXpForUser(profile.id);
      synced.push({
        userId: result.userId,
        githubUsername: result.githubUsername,
        totalXp: result.totalXp,
        xpDelta: result.xpDelta,
      });
    } catch (cause) {
      failed.push({
        userId: profile.id,
        reason: cause instanceof Error ? cause.message : "falha desconhecida",
      });
    }
  }

  return {
    syncedCount: synced.length,
    failedCount: failed.length,
    synced,
    failed,
  };
}

export async function POST(request: Request) {
  if (!hasValidSecret(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await runSyncAll();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
