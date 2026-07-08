import { supabase } from "@gitquest/database";
import Link from "next/link";
import { WorldWrapper } from "./src/components/WorldWrapper";
import { Leaderboard } from "./src/components/Leaderboard";
import { LuckboxChest } from "./src/components/LuckboxChest";

export default async function Home() {
  // Busca os heróis para popular o mapa diretamente no servidor
  const { data: players } = await supabase.from("users").select("*");

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-900">
      
      {/* Camada do Jogo 2D - Encapsulada no Wrapper Client-Side */}
      <WorldWrapper players={players || []} />

      {/* Camada da UI - O layout de informações original se mantém intacto no topo */}
      <Leaderboard />

      {/* Acesso ao perfil/inventário para editar o boneco */}
      <Link
        href="/perfil"
        className="fixed top-6 left-6 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950/80 backdrop-blur border border-amber-700/40 text-amber-300 text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
      >
        <span className="text-lg">🎒</span> Meu Perfil
      </Link>

      {/* Baú da Luckbox no canto inferior esquerdo */}
      <LuckboxChest />
      
    </main>
  );
}