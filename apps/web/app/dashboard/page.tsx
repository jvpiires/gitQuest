'use client';

import { useEffect, useState } from 'react';
import { supabase, ClassType } from '@gitquest/database';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Estados para o formulário de criação
  const [isNewUser, setIsNewUser] = useState(false);
  const [gitlabUsername, setGitlabUsername] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/');
        return;
      }

      setUserId(session.user.id);

      // Verifica se o usuário já tem um personagem na tabela public.users
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profile || !profile.class_type) {
        setIsNewUser(true);
      } else {
        setIsNewUser(false);
        // Aqui depois vamos carregar os dados reais de XP e Nível
      }
      
      setLoading(false);
    }

    checkUser();
  }, [router]);

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitlabUsername || !selectedClass || !userId) return;

    setSaving(true);

    const { error } = await supabase
      .from('users')
      .upsert({ 
        id: userId,
        gitlab_username: gitlabUsername.replace('@', ''), // Remove o @ caso o usuário digite
        class_type: selectedClass,
        current_level: 1,
        total_xp: 0
      });

    if (error) {
      console.error('Erro ao salvar personagem:', error);
      alert('Erro ao forjar personagem. Tente novamente.');
      setSaving(false);
      return;
    }

    setIsNewUser(false);
    setSaving(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Carregando a Taverna...</div>;
  }

  // --- TELA DE CRIAÇÃO DE PERSONAGEM ---
  if (isNewUser) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <h1 className="text-3xl font-bold mb-2">Bem-vindo à Taverna!</h1>
        <p className="text-gray-400 mb-8 text-center max-w-md">
          Para que o sistema reconheça seus feitos no código, precisamos vincular sua conta do GitLab e escolher sua classe.
        </p>

        <form onSubmit={handleCreateCharacter} className="w-full max-w-2xl flex flex-col gap-8">
          
          <div className="flex flex-col gap-2 items-center">
            <label className="font-semibold text-lg">Qual o seu usuário no GitLab interno?</label>
            <input
              type="text"
              placeholder="ex: joao.silva"
              value={gitlabUsername}
              onChange={(e) => setGitlabUsername(e.target.value)}
              required
              className="px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-orange-500 text-white w-full max-w-sm text-center"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {/* Cards de Seleção de Classe */}
            {[
              { id: 'ASSASSIN', name: '🗡️ Assassino', desc: 'Ganha bônus fechando bugs rapidamente.' },
              { id: 'MAGE', name: '🧙‍♂️ Mago', desc: 'Bônus por grandes refatorações e testes.' },
              { id: 'CLERIC', name: '🛡️ Clérigo', desc: 'Bônus massivo em Code Reviews estruturados.' },
              { id: 'ARCHER', name: '🏹 Arqueiro', desc: 'Bônus por pipelines CI/CD perfeitas.' }
            ].map((cls) => (
              <div 
                key={cls.id}
                onClick={() => setSelectedClass(cls.id as ClassType)}
                className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${
                  selectedClass === cls.id 
                    ? 'border-orange-500 bg-gray-800 scale-105' 
                    : 'border-gray-700 hover:border-gray-500 bg-gray-900/50'
                }`}
              >
                <h3 className="text-xl font-bold text-center mb-2">{cls.name}</h3>
                <p className="text-sm text-gray-400 text-center">{cls.desc}</p>
              </div>
            ))}
          </div>

          <button 
            type="submit"
            disabled={saving || !selectedClass || !gitlabUsername}
            className="mt-4 mx-auto px-8 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded-lg font-bold text-lg transition-colors w-full max-w-sm"
          >
            {saving ? 'Forjando...' : 'Forjar Personagem'}
          </button>
        </form>
      </main>
    );
  }

  // --- O DASHBOARD REAL (Após escolher a classe) ---
  return (
    <main className="min-h-screen p-8 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-4">Painel do Aventureiro</h1>
      <p className="text-gray-400">Seu personagem está pronto e aguardando seus commits!</p>
      
      {/* Aqui entrará a HUD futuramente (Barra de XP, Nível, Ranking) */}
    </main>
  );
}