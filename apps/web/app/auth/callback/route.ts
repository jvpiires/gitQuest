import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Função auxiliar para descobrir a stack do Github
async function fetchTopLanguages(username: string): Promise<string[]> {
  try {
    const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=50&sort=pushed`, {
      headers: { 'User-Agent': 'GitQuest-App' },
      next: { revalidate: 3600 } // Faz cache por 1 hora para não estourar o limite do GitHub
    });
    
    if (!res.ok) return [];
    
    const repos = await res.json();
    const languageCounts: Record<string, number> = {};

    repos.forEach((repo: any) => {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    });

    // Ordena do maior para o menor e pega os top 3
    const topLanguages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    return topLanguages;
  } catch (error) {
    console.error("Erro ao buscar repositórios:", error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )
    
    // 1. Troca o código pela sessão
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)
    
    // 2. Extrai e salva as linguagens no primeiro login ou atualização
    if (session?.user) {
      // O username do GitHub normalmente vem nos user_metadata do Supabase
      const githubUsername = session.user.user_metadata.user_name || session.user.user_metadata.preferred_username;
      
      if (githubUsername) {
        const topStack = await fetchTopLanguages(githubUsername);
        
        // Atualiza o profile do jogador de forma silenciosa
        if (topStack.length > 0) {
          // Utilizando a service_role_key para garantir permissão de escrita
          const supabaseAdmin = createServerClient(
             process.env.NEXT_PUBLIC_SUPABASE_URL!,
             process.env.SUPABASE_SERVICE_ROLE_KEY!,
             { cookies: { getAll() { return [] }, setAll() {} } }
          );

          await supabaseAdmin
            .from('profiles')
            .update({ tech_stack: topStack })
            .eq('id', session.user.id);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/game`)
}