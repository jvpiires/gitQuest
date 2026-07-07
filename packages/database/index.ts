import { createClient } from '@supabase/supabase-js';

// Usamos variáveis de ambiente que serão configuradas na Vercel e no Desktop
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Atenção: Variáveis de ambiente do Supabase não encontradas.');
}

export const supabase = createClient(
  supabaseUrl as string, 
  supabaseAnonKey as string
);

// NOVA FUNÇÃO: Cria um cliente com privilégios de Admin para os Webhooks
export const getSupabaseAdmin = (serviceRoleKey: string) => {
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
}