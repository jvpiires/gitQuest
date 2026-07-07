import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@gitquest/database';

// Ignora a verificação estrita de SSL do Node.js (Apenas para dev local em redes corporativas)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Cria um cliente com privilégios de Admin para ignorar o RLS durante o webhook
const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const eventType = payload.object_kind;

    if (eventType === 'push') {
      const gitlabUsername = payload.user_username;
      const commitsCount = payload.total_commits_count || 1;
      
      // XP Base: 100 XP por commit
      const xpGained = commitsCount * 100;

      // 1. Busca o usuário pelo username do GitLab
      const { data: user, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('gitlab_username', gitlabUsername)
        .single();

        if (fetchError) {
            console.error('🚨 ERRO INTERNO DO SUPABASE:', fetchError);
        }

        if (!user) {
            console.log(`Usuário não encontrado: ${gitlabUsername}`);
            return NextResponse.json({ message: 'Usuário não cadastrado no jogo.' }, { status: 200 });
        }

      // 2. Calcula os novos status
      const newTotalXP = user.total_xp + xpGained;
      // Regra simples: 1 Nível a cada 1000 XP
      const newLevel = Math.floor(newTotalXP / 1000) + 1; 

      // 3. Atualiza o banco de dados
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          total_xp: newTotalXP,
          current_level: newLevel
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error('Falha ao atualizar o banco de dados.');
      }

      console.log(`🗡️ [LEVEL UP/XP] ${gitlabUsername} ganhou ${xpGained} XP! (Nível atual: ${newLevel}, XP Total: ${newTotalXP})`);
    }

    return NextResponse.json({ message: 'Webhook processado com sucesso!' });
  } catch (error) {
    console.error('Erro no Webhook:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}