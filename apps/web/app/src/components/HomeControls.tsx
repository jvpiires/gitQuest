"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@gitquest/database";

// Controles no topo direito da tela inicial:
// - Login/Logout conforme a sessão.
// - "Sincronizar todos": puxa a XP de todos os jogadores do GitLab.
export function HomeControls() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setLoggedIn(Boolean(data.session));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/sync-all", { method: "POST" });
      const data = (await res.json()) as { synced?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Falha ao sincronizar.");
      setSyncMsg(`✅ ${data.synced ?? 0} sincronizados`);
      // Atualiza o mundo/leaderboard com os novos níveis.
      router.refresh();
    } catch (err) {
      console.error(err);
      setSyncMsg(err instanceof Error ? err.message : "Erro ao sincronizar.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  };

  return (
    <div className="fixed top-6 right-6 z-40 flex items-center gap-3">
      {syncMsg && (
        <span className="text-xs font-semibold text-amber-200 bg-slate-950/80 px-3 py-1.5 rounded-full border border-amber-700/40">
          {syncMsg}
        </span>
      )}

      <button
        type="button"
        onClick={handleSyncAll}
        disabled={syncing}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950/80 backdrop-blur border border-emerald-700/40 text-emerald-300 text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        <span className={`text-lg ${syncing ? "animate-spin" : ""}`}>🔄</span>
        {syncing ? "Sincronizando..." : "Sincronizar todos"}
      </button>

      {loggedIn ? (
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950/80 backdrop-blur border border-slate-700 text-slate-300 text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
        >
          <span className="text-lg">🚪</span> Sair
        </button>
      ) : (
        <Link
          href="/login"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-600 border border-amber-500 text-white text-sm font-bold uppercase tracking-widest hover:bg-amber-700 transition-colors"
        >
          <span className="text-lg">⚔️</span> Entrar
        </Link>
      )}
    </div>
  );
}
