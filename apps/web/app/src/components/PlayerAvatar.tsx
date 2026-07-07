"use client";

import { useEffect, useState } from "react";
import { type User } from "@gitquest/database";

interface PlayerAvatarProps {
  player: User;
}

export function PlayerAvatar({ player }: PlayerAvatarProps) {
  // Posições aleatórias iniciais
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Define a posição inicial apenas no cliente para evitar erros de hidratação do Next.js
    const startX = Math.floor(Math.random() * (window.innerWidth - 100));
    const startY = Math.floor(Math.random() * (window.innerHeight - 150));
    setPosition({ x: startX, y: startY });

    // Lógica simples de patrulha: o boneco escolhe um novo ponto a cada 4 a 8 segundos
    const moveInterval = setInterval(() => {
      const newX = Math.floor(Math.random() * (window.innerWidth - 100));
      const newY = Math.floor(Math.random() * (window.innerHeight - 150));
      setPosition({ x: newX, y: newY });
    }, Math.random() * 4000 + 4000);

    return () => clearInterval(moveInterval);
  }, []);

  // Cores baseadas na classe
  const getClassColor = (classType: string) => {
    switch (classType) {
      case 'ASSASSIN': return 'bg-purple-600 shadow-purple-500/50';
      case 'MAGE': return 'bg-blue-500 shadow-blue-500/50';
      case 'CLERIC': return 'bg-amber-100 shadow-amber-100/50 text-slate-800';
      case 'ARCHER': return 'bg-emerald-500 shadow-emerald-500/50';
      default: return 'bg-slate-500 shadow-slate-500/50';
    }
  };

  return (
    <div 
      className="absolute flex flex-col items-center justify-center transition-all duration-[3000ms] ease-in-out"
      style={{ 
        transform: `translate(${position.x}px, ${position.y}px)`,
        // Evita que o componente seja renderizado no canto 0,0 antes do useEffect rodar
        opacity: position.x === 0 && position.y === 0 ? 0 : 1 
      }}
    >
      {/* Nameplate - Mantendo a exibição de dados íntegra e sem arredondamentos */}
      <div className="bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/50 shadow-xl mb-3 flex flex-col items-center min-w-[120px]">
        <span className="text-xs font-bold text-slate-200 truncate w-full text-center">
          {player.gitlab_username}
        </span>
        <span className="text-[10px] font-mono text-emerald-400 mt-0.5">
          Lv.{player.current_level} | {player.total_xp} XP
        </span>
      </div>

      {/* O "Sprite" do Boneco (Por enquanto, um bloco estilizado) */}
      <div className={`w-12 h-16 rounded-t-full rounded-b-md shadow-lg ${getClassColor(player.class_type)} relative flex items-center justify-center border-2 border-slate-800`}>
        {/* Olhinhos para dar vida */}
        <div className="absolute top-4 flex gap-2">
          <div className="w-1.5 h-2 bg-slate-900 rounded-full animate-pulse"></div>
          <div className="w-1.5 h-2 bg-slate-900 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {/* Sombra no chão */}
      <div className="w-10 h-3 bg-black/40 rounded-[100%] mt-1 blur-[2px]"></div>
    </div>
  );
}