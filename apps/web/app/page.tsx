import { supabase } from "@gitquest/database";
import Link from "next/link";
import { WorldWrapper } from "./src/components/WorldWrapper";
import { Leaderboard } from "./src/components/Leaderboard";
import { LuckboxChest } from "./src/components/LuckboxChest";
import { SuggestionChest } from "./src/components/SuggestionChest";
import { HomeControls } from "./src/components/HomeControls";
import { VersionNoticeModal } from "./src/components/VersionNoticeModal";

export default async function Home() {
  // Busca os heróis para popular o mapa (apenas as colunas usadas na UI).
  const { data: players } = await supabase
    .from("users")
    .select("id, gitlab_username, class_type, current_level, total_xp");

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

      {/* Login/Logout + Sincronizar todos no topo direito */}
      <HomeControls />

      {/* Baú da Luckbox no canto inferior esquerdo */}
      <LuckboxChest />

      {/* Caixa de sugestão para os jogadores enviarem melhorias ao admin */}
      <SuggestionChest />

      {/* Aviso de versao exibido ao entrar na home. */}
      <VersionNoticeModal />
      
    </main>
  );
}