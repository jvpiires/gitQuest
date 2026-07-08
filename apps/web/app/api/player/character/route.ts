import { getSupabaseAdmin } from "@gitquest/database";
import { NextResponse } from "next/server";
import { getAuthMode, readInternalSession } from "../../_lib/session";

const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

const ALLOWED_CLASSES = new Set(["ASSASSIN", "MAGE", "CLERIC", "ARCHER"]);

export async function POST(request: Request) {
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

  const body = (await request.json()) as {
    gitlabUsername?: string;
    classType?: string;
  };

  const gitlabUsername = (body.gitlabUsername ?? "").trim().replace(/^@+/, "");
  const classType = (body.classType ?? "").trim().toUpperCase();

  if (!gitlabUsername) {
    return NextResponse.json({ error: "gitlabUsername é obrigatório." }, { status: 400 });
  }

  if (!ALLOWED_CLASSES.has(classType)) {
    return NextResponse.json({ error: "classType inválida." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("users").upsert({
    id: session.sub,
    gitlab_username: gitlabUsername,
    class_type: classType,
    current_level: 1,
    total_xp: 0,
  });

  if (error) {
    return NextResponse.json({ error: "Falha ao salvar personagem." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
