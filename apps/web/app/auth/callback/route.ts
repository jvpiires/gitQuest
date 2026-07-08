import { NextResponse } from 'next/server';
import { supabase } from '@gitquest/database';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const providerError = requestUrl.searchParams.get('error');
  const providerErrorDescription = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next') ?? '/'; // Volta para a tela inicial após logar

  if (providerError) {
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('authError', providerError);
    if (providerErrorDescription) {
      loginUrl.searchParams.set('authErrorDescription', providerErrorDescription);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    try {
      // Troca o código temporário por uma sessão válida do Supabase
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const loginUrl = new URL('/login', requestUrl.origin);
        loginUrl.searchParams.set('authError', error.name || 'exchange_failed');
        loginUrl.searchParams.set(
          'authErrorDescription',
          error.message || 'Não foi possível concluir o login via provedor externo.',
        );
        return NextResponse.redirect(loginUrl);
      }
    } catch (error) {
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('authError', 'exchange_exception');
      loginUrl.searchParams.set(
        'authErrorDescription',
        error instanceof Error ? error.message : 'Erro inesperado no callback de autenticação.',
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redireciona o usuário para a página interna do jogo
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}