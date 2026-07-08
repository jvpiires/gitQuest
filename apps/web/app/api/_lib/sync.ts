import {
  getSupabaseAdmin,
  levelFromXp,
  boxesEarnedForLevel,
  XP_PER_COMMIT,
} from "@gitquest/database";

// Ignora a verificação estrita de SSL (rede corporativa usa cert self-signed).
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // NOSONAR

// Cliente admin (service role) para atualizar usuários ignorando o RLS.
const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Configuração do GitLab — SEMPRE no servidor, nunca exposta ao client.
// O GitLab interno (rede corporativa) só responde em http, por isso o default.
const GITLAB_API_URL = process.env.GITLAB_API_URL;
export const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
const STRICT_GITLAB_SYNC = process.env.STRICT_GITLAB_SYNC === "true";

interface GitlabUser {
  id: number;
  username?: string;
}

interface GitlabPushEvent {
  push_data?: { commit_count?: number };
}

// Snapshot de um jogador no banco, o suficiente para recalcular XP/caixas.
export interface DbUser {
  id: string;
  gitlab_username: string;
  total_xp: number;
  current_level: number;
  available_boxes: number;
  boxes_opened: number;
}

export interface SyncedUser {
  id: string;
  total_xp: number;
  current_level: number;
  available_boxes: number;
}

export interface SyncAllResult {
  syncedUsers: SyncedUser[];
  failedCount: number;
}

function getGitlabApiUrl(): string {
  const configured = GITLAB_API_URL?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === "production" && STRICT_GITLAB_SYNC) {
    throw new Error("GITLAB_API_URL não configurado em produção.");
  }

  // Fallback útil apenas para ambiente local/corporativo em desenvolvimento.
  return "http://git.sad.infovia-mt/api/v4"; // NOSONAR
}

// Busca a XP retroativa somando os commits do histórico de "push" do usuário.
async function fetchRetroactiveXp(gitlabUsername: string): Promise<number> {
  const gitlabApiUrl = getGitlabApiUrl();
  const headers = { "PRIVATE-TOKEN": GITLAB_TOKEN ?? "" };

  // 1. Descobre o ID do usuário pelo username (normaliza: sem @, sem espaços).
  const cleanUsername = gitlabUsername.replace("@", "").trim();
  const userRes = await fetch(
    `${gitlabApiUrl}/users?username=${encodeURIComponent(cleanUsername)}`,
    { headers, signal: AbortSignal.timeout(8000) },
  );
  if (!userRes.ok) {
    throw new Error(`GitLab respondeu ${userRes.status} ao buscar usuário.`);
  }
  let users = (await userRes.json()) as GitlabUser[];

  // Fallback: se não achou pelo username exato, tenta uma busca genérica
  // e filtra pelo username (case-insensitive).
  if (!Array.isArray(users) || users.length === 0) {
    const searchRes = await fetch(
      `${gitlabApiUrl}/users?search=${encodeURIComponent(cleanUsername)}`,
      { headers, signal: AbortSignal.timeout(8000) },
    );
    if (searchRes.ok) {
      const found = (await searchRes.json()) as GitlabUser[];
      users = found.filter(
        (u) => u.username?.toLowerCase() === cleanUsername.toLowerCase(),
      );
    }
  }

  if (!Array.isArray(users) || users.length === 0) {
    console.warn(`⚠️ GitLab: usuário "${cleanUsername}" não encontrado.`);
    return 0;
  }

  const userId = users[0].id;

  // 2. Busca os eventos de push (paginado até 100 por página).
  const eventsRes = await fetch(
    `${gitlabApiUrl}/users/${userId}/events?action=pushed&per_page=100`,
    { headers, signal: AbortSignal.timeout(8000) },
  );
  if (!eventsRes.ok) {
    throw new Error(`GitLab respondeu ${eventsRes.status} ao buscar eventos.`);
  }
  const events = (await eventsRes.json()) as GitlabPushEvent[];

  // 3. Soma a XP por commit.
  const xp = events.reduce((total, event) => {
    const commits = event.push_data?.commit_count ?? 0;
    return total + commits * XP_PER_COMMIT;
  }, 0);

  console.info(
    `✅ GitLab sync: ${cleanUsername} (id ${userId}) → ${events.length} pushes, ${xp} XP.`,
  );
  return xp;
}

// Sincroniza UM jogador com o GitLab: busca a XP retroativa pelo username,
// recalcula nível e luckboxes e persiste. Retorna o snapshot atualizado.
// Resiliente: se o GitLab falhar para este usuário, mantém a XP atual.
export async function syncUser(user: DbUser): Promise<SyncedUser> {
  let retroXp = 0;
  try {
    retroXp = await fetchRetroactiveXp(user.gitlab_username);
  } catch (gitlabError) {
    if (process.env.NODE_ENV === "production" && STRICT_GITLAB_SYNC) {
      throw new Error(
        `GitLab indisponível para ${user.gitlab_username}: ${
          gitlabError instanceof Error ? gitlabError.message : "erro desconhecido"
        }`,
      );
    }

    console.warn(
      `⚠️ GitLab indisponível para ${user.gitlab_username} (${getGitlabApiUrl()}), usando XP atual.`,
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

// Sincroniza TODOS os jogadores com o GitLab, em paralelo.
// Retorna os snapshots dos que sincronizaram com sucesso.
export async function syncAllUsers(): Promise<SyncAllResult> {
  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select(
      "id, gitlab_username, total_xp, current_level, available_boxes, boxes_opened",
    );

  if (error || !users) {
    throw new Error("Falha ao carregar os jogadores.");
  }

  const results = await Promise.allSettled(
    users.map((u) => syncUser(u as DbUser)),
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.warn(`⚠️ ${failed.length} jogador(es) falharam ao sincronizar no GitLab.`);
  }

  const syncedUsers = results
    .filter((r): r is PromiseFulfilledResult<SyncedUser> => r.status === "fulfilled")
    .map((r) => r.value);

  return {
    syncedUsers,
    failedCount: failed.length,
  };
}
