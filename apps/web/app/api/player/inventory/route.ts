import { getSupabaseAdmin } from "@gitquest/database";
import { NextResponse } from "next/server";
import { getAuthMode, readInternalSession } from "../../_lib/session";

const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: Request) {
  if (getAuthMode() !== "internal_gitlab") {
    return NextResponse.json(
      { error: "Rota disponível apenas no modo internal_gitlab." },
      { status: 400 },
    );
  }

  const session = readInternalSession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("user_items")
    .select("item_id, equipped")
    .eq("user_id", session.sub);

  if (error) {
    return NextResponse.json({ error: "Falha ao carregar inventário." }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
