import { NextResponse } from 'next/server';
import { supabase } from '@gitquest/database';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'; // Vai para o dashboard após logar

  if (code) {
    // Troca o código temporário por uma sessão válida do Supabase
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redireciona o usuário para a página interna do jogo
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}