'use client';

import { useState } from 'react';
import { supabase } from '@gitquest/database';

export default function Home() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Redireciona para aquela mesma rota de callback que já criamos!
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(`Erro: ${error.message}`);
    } else {
      setMessage('✨ Pergaminho enviado! Verifique seu e-mail para entrar no jogo.');
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-4">⚔️ GitQuest</h1>
      <p className="mb-8 text-gray-400">Insira seu e-mail para forjar sua lenda no repositório.</p>
      
      <form onSubmit={handleMagicLink} className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="email"
          placeholder="seu.email@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-orange-500 text-white"
        />
        <button 
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Enviando magia...' : 'Entrar na Dungeon'}
        </button>
      </form>

      {message && <p className="mt-6 text-sm text-center text-orange-400">{message}</p>}
    </main>
  );
}