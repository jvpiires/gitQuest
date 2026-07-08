import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  levelFromXp,
  boxesEarnedForLevel,
  XP_PER_COMMIT,
} from "@gitquest/database";

// Ignora a verificação estrita de SSL (apenas dev local em rede corporativa).
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Cliente admin (service role) para atualizar o usuário ignorando o RLS.
const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Configuração do GitLab — SEMPRE no servidor, nunca exposta ao client.
// O GitLab interno (rede corporativa) só responde em http, por isso o default.
const GITLAB_API_URL =
  process.env.GITLAB_API_URL ?? "http://git.sad.infovia-mt/api/v4"; // NOSONAR
const GITLAB_TOKEN = process.env.GITLAB_TOKEN;

interface GitlabUser {
  id: number;
}

interface GitlabPushEvent {
  push_data?: { commit_count?: number };
}

// Busca a XP retroativa somando os commits do histórico de "push" do usuário.
async function fetchRetroactiveXp(gitlabUsername: string): Promise<number> {
  const headers = { "PRIVATE-TOKEN": GITLAB_TOKEN ?? "" };
  // Aborta se o GitLab não responder em 8s (evita travar a request).
  const signal = AbortSignal.timeout(8000);

  // 1. Descobre o ID do usuário pelo username.
  const userRes = await fetch(
    `${GITLAB_API_URL}/users?username=${encodeURIComponent(gitlabUsername)}`,
    { headers, signal },
  );
  if (!userRes.ok) {
    throw new Error(`GitLab respondeu ${userRes.status} ao buscar usuário.`);
  }
  const users = (await userRes.json()) as GitlabUser[];
  if (!Array.isArray(users) || users.length === 0) return 0;

  const userId = users[0].id;

  // 2. Busca os eventos de push (paginado até 100 por página).
  const eventsRes = await fetch(
    `${GITLAB_API_URL}/users/${userId}/events?action=pushed&per_page=100`,
    { headers, signal: AbortSignal.timeout(8000) },
  );
  if (!eventsRes.ok) {
    throw new Error(`GitLab respondeu ${eventsRes.status} ao buscar eventos.`);
  }
  const events = (await eventsRes.json()) as GitlabPushEvent[];

  // 3. Soma a XP por commit.
  return events.reduce((xp, event) => {
    const commits = event.push_data?.commit_count ?? 0;
    return xp + commits * XP_PER_COMMIT;
  }, 0);
}

// Reconcilia as luckboxes de todos os jogadores a partir da XP já persistida.
// Não chama o GitLab — apenas recalcula nível e caixas do que está no banco.
// `skipUserId` evita reprocessar quem acabou de ser atualizado no POST.
async function reconcileAllBoxes(skipUserId: string): Promise<void> {
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, total_xp, current_level, available_boxes, boxes_opened");

  if (!users) return;

  const updates = users
    .filter((u) => u.id !== skipUserId)
    .map((u) => {
      const level = levelFromXp(u.total_xp ?? 0);
      const earned = boxesEarnedForLevel(level);
      const available = Math.max(
        u.available_boxes ?? 0,
        earned - (u.boxes_opened ?? 0),
      );
      // Só grava se algo mudou, para evitar writes desnecessários.
      if (available === (u.available_boxes ?? 0) && level === u.current_level) {
        return null;
      }
      return supabaseAdmin
        .from("users")
        .update({ current_level: level, available_boxes: available })
        .eq("id", u.id);
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  await Promise.allSettled(updates);
}

// Snapshot de um jogador no banco, o suficiente para recalcular XP/caixas.
interface DbUser {
  id: string;
  gitlab_username: string;
  total_xp: number;
  current_level: number;
  available_boxes: number;
  boxes_opened: number;
}

// Sincroniza UM jogador com o GitLab: busca a XP retroativa pelo username,
// recalcula nível e luckboxes e persiste. Retorna o snapshot atualizado.
// Resiliente: se o GitLab falhar para este usuário, mantém a XP atual.
async function syncUser(user: DbUser) {
  let retroXp = 0;
  try {
    retroXp = await fetchRetroactiveXp(user.gitlab_username);
  } catch (gitlabError) {
    console.warn(
      `⚠️ GitLab indisponível para ${user.gitlab_username}, usando XP atual.`,
      gitlabError,
    );
  }

  const newTotalXp = Math.max(user.total_xp ?? 0, retroXp);
  const newLevel = levelFromXp(newTotalXp);
  const totalBoxesEarned = boxesEarnedForLevel(newLevel);
  // Nunca reduz abaixo do saldo atual (evita "perder" caixas já ganhas).
  const availableBoxes = Math.max(
    user.available_boxes ?? 0,
    totalBoxesEarned - (user.boxes_opened ?? 0),
  );

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      total_xp: newTotalXp,
      current_level: newLevel,
      available_boxes: availableBoxes,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(`Falha ao atualizar ${user.gitlab_username}.`);
  }

  return {
    id: user.id,
    total_xp: newTotalXp,
    current_level: newLevel,
    available_boxes: availableBoxes,
  };
}

export async function POST(request: Request) {
  try {
    if (!GITLAB_TOKEN) {
      return NextResponse.json(
        { error: "GITLAB_TOKEN não configurado no servidor." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { userId?: string };
    const userId = body.userId;
    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório." },
        { status: 400 },
      );
    }

    // Busca TODOS os jogadores para sincronizar cada um pelo username no GitLab.
    const { data: users, error: fetchError } = await supabaseAdmin
      .from("users")
      .select(
        "id, gitlab_username, total_xp, current_level, available_boxes, boxes_opened",
      );

    if (fetchError || !users) {
      return NextResponse.json(
        { error: "Falha ao carregar os jogadores." },
        { status: 500 },
      );
    }

    // Sincroniza todos em paralelo. Cada um busca sua própria XP no GitLab.
    const results = await Promise.allSettled(
      users.map((u) => syncUser(u as DbUser)),
    );

    // Localiza o snapshot do solicitante para devolver ao client.
    const requester = results.find(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof syncUser>>> =>
        r.status === "fulfilled" && r.value.id === userId,
    );

    if (!requester) {
      return NextResponse.json(
        { error: "Jogador não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      total_xp: requester.value.total_xp,
      current_level: requester.value.current_level,
      available_boxes: requester.value.available_boxes,
      synced: results.filter((r) => r.status === "fulfilled").length,
    });
  } catch (error) {
    console.error("Erro no sync de XP:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
