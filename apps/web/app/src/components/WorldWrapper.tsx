"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase, type User } from "@gitquest/database";

// O dynamic com ssr: false é perfeitamente legal aqui dentro de um Client Component
const TibiaWorld = dynamic(() => import("./TibiaWorld"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-500 font-mono text-sm tracking-widest">
      CARREGANDO MUNDO...
    </div>
  ),
});

interface WorldWrapperProps {
  // Players vindos do servidor (podem chegar vazios se não houver sessão no server)
  players?: User[];
}

export function WorldWrapper({ players: initialPlayers = [] }: Readonly<WorldWrapperProps>) {
  const [players, setPlayers] = useState<User[]>(initialPlayers);

  useEffect(() => {
    // Busca no cliente garante que os bonecos apareçam mesmo se o fetch do
    // servidor voltar vazio (RLS/sessão). Espelha a lógica do Leaderboard.
    async function fetchPlayers() {
      const { data, error } = await supabase.from("users").select("*");
      if (!error && data && data.length > 0) {
        setPlayers(data);
      }
    }

    fetchPlayers();
  }, []);

  if (players.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-500 font-mono text-sm tracking-widest">
        INVOCANDO HERÓIS...
      </div>
    );
  }

  // A `key` força o Phaser a reinicializar quando a lista de players muda,
  // pois o useEffect interno do TibiaWorld não recria o jogo sozinho.
  return <TibiaWorld key={players.length} players={players} />;
}