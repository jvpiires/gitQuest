import { getSupabaseAdmin } from "@gitquest/database";
import { NextResponse } from "next/server";
import { getAuthMode, readInternalSession } from "../_lib/session";

const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ADMIN_USERNAME = "joao.santos";

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

  if (session.gitlabUsername.toLowerCase() !== ADMIN_USERNAME) {
    return NextResponse.json({ error: "Acesso restrito ao admin." }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("admin_suggestions")
    .select("id, author_username, message, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: "Falha ao listar sugestões." }, { status: 500 });
  }

  return NextResponse.json({ suggestions: data ?? [] });
}

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

  const body = (await request.json()) as { message?: string };
  const message = (body.message ?? "").trim();

  if (message.length < 10 || message.length > 600) {
    return NextResponse.json(
      { error: "Mensagem deve ter entre 10 e 600 caracteres." },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin.from("admin_suggestions").insert({
    author_id: session.sub,
    author_username: session.gitlabUsername,
    message,
  });

  if (error) {
    return NextResponse.json({ error: "Falha ao enviar sugestão." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
