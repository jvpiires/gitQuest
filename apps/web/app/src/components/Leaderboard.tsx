"use client";

import { useEffect, useState } from "react";
import { supabase, type User } from "@gitquest/database";

export function Leaderboard() {
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayers() {
      // Busca os top 10 heróis ordenados por XP
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("total_xp", { ascending: false })
        .limit(10);

      if (!error && data) {
        setPlayers(data);
      } else if (error) {
        console.error("Erro ao buscar o placar:", error);
      }
      setLoading(false);
    }

    fetchPlayers();
  }, []);

  // Helper simples para traduzir a classe em um emoji para a UI
  const getClassIcon = (classType: string) => {
    switch (classType) {
      case 'ASSASSIN': return '🗡️';
      case 'MAGE': return '🔮';
      case 'CLERIC': return '✝️';
      case 'ARCHER': return '🏹';
      default: return '🛡️';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-80 bg-slate-950/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-2xl">
      <h2 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span>🏆</span> Rank dos que mais Trabalhou
      </h2>

      {loading ? (
        <div className="text-slate-400 text-sm animate-pulse">Lendo os pergaminhos...</div>
      ) : (
        <ul className="flex flex-col gap-3">
          {players.map((player, index) => (
            <li 
              key={player.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Destaque para o Top 3 */}
                <span className={`font-black text-lg ${
                  index === 0 ? 'text-amber-400 drop-shadow-md' : 
                  index === 1 ? 'text-slate-300' : 
                  index === 2 ? 'text-amber-700' : 
                  'text-slate-600'
                }`}>
                  #{index + 1}
                </span>
                
                <div className="flex flex-col">
                  <span className="text-slate-200 font-semibold text-sm flex items-center gap-1">
                    {getClassIcon(player.class_type)} {player.gitlab_username}
                  </span>
                  <span className="text-slate-500 text-xs">
                    Nível {player.current_level}
                  </span>
                </div>
              </div>

              {/* Mantendo a precisão exata da XP sem arredondamentos */}
              <div className="text-right">
                <span className="text-emerald-400 font-bold text-sm tracking-wide">
                  {player.total_xp} XP
                </span>
              </div>
            </li>
          ))}
          
          {players.length === 0 && (
            <div className="text-slate-500 text-sm text-center py-4">
              Nenhum herói registrado ainda.
            </div>
          )}
        </ul>
      )}
    </div>
  );
}