"use client";

import { supabase } from "@gitquest/database";
import { Teko } from "next/font/google";

const nordicFont = Teko({ subsets: ["latin"], weight: ["500"] });

export default function LoginPage() {
  const handleGithubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/game` },
    });
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-slate-950">
      {/* MUNDO VIVO AO FUNDO (Com blur aplicado via CSS) */}
      <div className="absolute inset-0 z-0 blur-sm brightness-50">
        {/* Passamos uma lista vazia ou mockada para o preview não travar */}
      </div>

      {/* PORTAL DE ACESSO (Centralizado e em destaque) */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div className="bg-slate-950/60 border border-slate-700/50 p-12 backdrop-blur-md shadow-2xl flex flex-col items-center max-w-lg w-full text-center">
          
          <h1 className={`${nordicFont.className} text-9xl text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]`}>
            GitQuest
          </h1>
          
          <div className="w-24 h-1 bg-amber-500 mb-10 shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>

          <p className="text-slate-300 font-mono text-sm mb-10 uppercase tracking-widest">
            A guilda para desenvolvedores.
          </p>

          <button
            onClick={handleGithubLogin}
            className="w-full flex items-center justify-center gap-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-4 px-6 transition-all duration-300 hover:scale-105 active:scale-95 border-b-4 border-amber-800"
          >
            <span className="font-bold uppercase tracking-wider">Desbloquear com GitHub</span>
          </button>
        </div>
      </div>
    </main>
  );
}