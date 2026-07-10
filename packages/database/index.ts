import { createClient } from '@supabase/supabase-js';

// Configuração centralizada
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Atenção: Variáveis de ambiente do Supabase não encontradas.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getSupabaseAdmin = (serviceRoleKey: string) => {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  return createClient(supabaseUrl as string, serviceRoleKey);
};

// ============================================================================
// REI DEMÔNIO
// ============================================================================
export const REI_DEMONIO_ID = "40971e45-9fd2-4116-86cc-a1998ea1a8ba";

export function isReiDemonio(userId: string): boolean {
  return userId === REI_DEMONIO_ID;
}

// ============================================================================
// SISTEMA DE RANKS E PROGRESSÃO
// ============================================================================
export type UserRank = 'BRONZE' | 'PRATA' | 'OURO' | 'PLATINA' | 'DIAMANTE' | 'REI_DEMONIO';

export const RANK_THRESHOLDS: Record<UserRank, number> = {
  BRONZE: 0,
  PRATA: 1000,
  OURO: 2500,
  PLATINA: 5000,
  DIAMANTE: 7500,
  REI_DEMONIO: 10000000000000000000000000000000,
};

export function getRankFromXp(totalXp: number): UserRank {
  if (totalXp >= RANK_THRESHOLDS.REI_DEMONIO) return 'REI_DEMONIO';
  if (totalXp >= RANK_THRESHOLDS.PLATINA) return 'PLATINA';
  if (totalXp >= RANK_THRESHOLDS.OURO) return 'OURO';
  if (totalXp >= RANK_THRESHOLDS.PRATA) return 'PRATA';
  return 'BRONZE';
}

export interface RankProgress {
  currentRank: UserRank;
  nextRank: UserRank | null;
  percentToNext: number;
}

export function calculateRankProgress(totalXp: number): RankProgress {
  const currentRank = getRankFromXp(totalXp);
  const ranks: UserRank[] = ['BRONZE', 'PRATA', 'OURO', 'PLATINA', 'REI_DEMONIO'];
  const currentIndex = ranks.indexOf(currentRank);
  const nextRank = ranks[currentIndex + 1] || null;

  const currentThreshold = RANK_THRESHOLDS[currentRank];
  const nextThreshold = nextRank ? RANK_THRESHOLDS[nextRank] : RANK_THRESHOLDS[currentRank];
  
  // Cálculo de progresso percentual (0-100)
  const range = nextThreshold - currentThreshold;
  const progress = range > 0 
    ? ((totalXp - currentThreshold) / range) * 100 
    : 100;

  return {
    currentRank,
    nextRank,
    percentToNext: Math.min(100, Math.max(0, progress)),
  };
}