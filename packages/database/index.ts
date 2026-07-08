import { createClient } from '@supabase/supabase-js';

// Usamos variáveis de ambiente que serão configuradas na Vercel e no Desktop
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Atenção: Variáveis de ambiente do Supabase não encontradas.');
}

export const supabase = createClient( 
  supabaseUrl as string, 
  supabaseAnonKey as string
);

// NOVA FUNÇÃO: Cria um cliente com privilégios de Admin para os Webhooks
export const getSupabaseAdmin = (serviceRoleKey: string) => {
  // Rede corporativa intercepta o HTTPS com um certificado self-signed, o que
  // faz o fetch do Node falhar ("SELF_SIGNED_CERT_IN_CHAIN"). Como isto só roda
  // no servidor, desabilitamos a verificação de TLS para o Supabase responder.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // NOSONAR
  return createClient(supabaseUrl as string, serviceRoleKey);
};

// Vamos já exportar alguns tipos úteis para o jogo!
export type ClassType = 'ASSASSIN' | 'MAGE' | 'CLERIC' | 'ARCHER';

export interface User {
  id: string;
  gitlab_username: string;
  class_type: ClassType;
  current_level: number;
  total_xp: number;
  // Luckbox: quantas caixas o jogador pode abrir e quantas já abriu.
  // Opcionais porque nem toda consulta seleciona essas colunas (ex.: mapa/placar).
  available_boxes?: number;
  boxes_opened?: number;
}

// Item que um jogador possui (linha da tabela public.user_items).
export interface UserItem {
  id: string;
  user_id: string;
  item_id: string; // casa com o catálogo em items.ts
  slot: string;
  equipped: boolean;
  acquired_at: string;
}

// Re-exporta o catálogo de itens/luckbox para quem importa @gitquest/database.
export * from './items';

// ============================================================================
// REGRAS DE PROGRESSÃO (compartilhadas entre webhook e sync retroativo)
// ============================================================================

// XP concedida por commit.
export const XP_PER_COMMIT = 100;

// A cada quantos níveis o jogador ganha uma luckbox.
export const LEVELS_PER_BOX = 5;

// --- CURVA DE XP PROGRESSIVA ---
// A XP total necessária para ATINGIR um nível cresce de forma quadrática:
// os primeiros níveis (0→10) são fáceis e vai ficando mais difícil ao infinito.
//   xpForLevel(N) = XP_BASE * N^2
// Ex.: N1=50, N5=1.250, N10=5.000, N20=20.000, N50=125.000.
const XP_BASE = 50;

// XP total acumulada necessária para atingir um determinado nível.
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return XP_BASE * (level - 1) * (level - 1);
}

// XP acumulada -> nível atual (inverte a curva quadrática).
export function levelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  return Math.floor(Math.sqrt(totalXp / XP_BASE)) + 1;
}

// Progresso dentro do nível atual, útil para a barra de "quanto falta".
export interface LevelProgress {
  level: number; // nível atual
  currentLevelXp: number; // XP acumulada desde o início do nível atual
  xpIntoLevel: number; // quanto já andou dentro do nível atual
  xpForNextLevel: number; // XP necessária para completar o nível atual
  percent: number; // 0..100 do progresso no nível
}

export function levelProgress(totalXp: number): LevelProgress {
  const level = levelFromXp(totalXp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = next - start;
  const xpIntoLevel = Math.max(0, totalXp - start);
  const percent = span > 0 ? Math.min(100, (xpIntoLevel / span) * 100) : 0;
  return {
    level,
    currentLevelXp: start,
    xpIntoLevel,
    xpForNextLevel: span,
    percent,
  };
}

// Quantas luckboxes um jogador deveria ter ganho até certo nível.
export function boxesEarnedForLevel(level: number): number {
  return Math.floor(level / LEVELS_PER_BOX);
}

