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
  available_boxes: number;
  boxes_opened: number;
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

// XP acumulada -> nível (1 nível a cada 1000 XP, começando no nível 1).
export function levelFromXp(totalXp: number): number {
  return Math.floor(totalXp / 1000) + 1;
}

// Quantas luckboxes um jogador deveria ter ganho até certo nível.
export function boxesEarnedForLevel(level: number): number {
  return Math.floor(level / LEVELS_PER_BOX);
}

