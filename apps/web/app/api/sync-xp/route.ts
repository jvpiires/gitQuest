import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@gitquest/database";
import { GITLAB_TOKEN, syncUser, type DbUser } from "../_lib/sync";
import { resolveGameRouteUserId } from "../_lib/request-auth";

const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: Request) {
  try {
    if (!GITLAB_TOKEN) {
      return NextResponse.json(
        { error: "GITLAB_TOKEN não configurado no servidor." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { userId?: string };
    const resolved = resolveGameRouteUserId(request, body.userId);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const userId = resolved.userId;

    // Sincroniza apenas o jogador logado (leve, roda a cada reload).
    // Para sincronizar TODOS os jogadores de uma vez, use /api/sync-all.
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select(
        "id, gitlab_username, total_xp, current_level, available_boxes, boxes_opened",
      )
      .eq("id", userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: "Jogador não encontrado." },
        { status: 404 },
      );
    }

    const synced = await syncUser(user as DbUser);
    return NextResponse.json(synced);
  } catch (error) {
    console.error("Erro no sync de XP:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
