import { supabase } from "@gitquest/database";
import { WorldWrapper } from "./src/components/WorldWrapper";
import { Leaderboard } from "./src/components/Leaderboard";

export default async function Home() {
  // Busca os heróis para popular o mapa diretamente no servidor
  const { data: players } = await supabase.from("users").select("*");

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-900">
      
      {/* Camada do Jogo 2D - Encapsulada no Wrapper Client-Side */}
      <WorldWrapper players={players || []} />

      {/* Camada da UI - O layout de informações original se mantém intacto no topo */}
      <Leaderboard />
      
    </main>
  );
}