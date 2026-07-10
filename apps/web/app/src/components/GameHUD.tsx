"use client";

import Link from "next/link";
import { useState } from "react";
import { HERO_CLASSES, type HeroClass } from "../lib/game/progression";
import type { WorldHero } from "../lib/game/types";

interface GameHUDProps {
  username: string;
  heroClass: HeroClass;
  level: number;
  xp: number;
  leaderboard: WorldHero[];
  guilds: { id: string; name: string; icon_url?: string | null }[];
}

export default function GameHUD({ username, heroClass, level, xp, leaderboard, guilds }: GameHUDProps) {
  const hero = HERO_CLASSES[heroClass];
  const [showGuilds, setShowGuilds] = useState(false);
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4 text-white sm:p-6">
      <div className="rounded-2xl border border-slate-500/60 bg-slate-950/85 px-4 py-3 shadow-2xl backdrop-blur">
        <p className="font-mono text-sm text-amber-300">{hero.icon} {hero.label}</p>
        <h1 className="font-mono text-lg font-bold">{username}</h1>
        <p className="font-mono text-xs text-slate-300">Nível {level} · {xp.toLocaleString("pt-BR")} XP</p>
      </div>
      <aside className="pointer-events-auto hidden w-64 rounded-2xl border border-slate-500/60 bg-slate-950/85 p-3 shadow-2xl backdrop-blur lg:block"><p className="font-mono text-xs font-bold text-amber-300">🏆 LEADERBOARD</p>{leaderboard.slice(0, 5).map((player, index) => <div key={player.id} className="mt-2 flex items-center justify-between rounded-lg bg-slate-800/80 px-2 py-1.5 font-mono text-xs"><span className="truncate text-slate-200">#{index + 1} {player.name}</span><span className="text-cyan-300">Lv.{Math.floor(Math.sqrt(player.totalXp / 50)) + 1}</span></div>)}</aside>
      <nav className="pointer-events-auto relative flex gap-2">
        <button onClick={() => setShowGuilds((open) => !open)} className="rounded-xl border border-cyan-300/40 bg-slate-900 px-4 py-3 font-mono text-sm font-bold text-cyan-100 shadow-lg transition hover:bg-slate-800">Guildas</button>
        <Link href="/perfil" className="rounded-xl border border-amber-300/40 bg-amber-500 px-4 py-3 font-mono text-sm font-bold text-slate-950 shadow-lg transition hover:bg-amber-300">
          Meu perfil
        </Link>
        {showGuilds && <div className="absolute right-0 top-14 w-72 rounded-2xl border border-slate-600 bg-slate-950 p-3 shadow-2xl"><p className="mb-2 font-mono text-xs text-amber-300">GUILDAS DO REINO</p>{guilds.length ? guilds.map((guild, index) => <div key={guild.id} className="mb-2 flex items-center gap-2 rounded-xl bg-slate-800 p-2 text-left"><span className="font-mono text-xs text-amber-300">#{index + 1}</span>{guild.icon_url ? <img src={guild.icon_url} alt="" className="h-7 w-7 rounded object-cover" /> : <span>🛡️</span>}<span className="truncate font-mono text-sm text-white">{guild.name}</span></div>) : <p className="text-sm text-slate-400">Nenhuma guilda criada.</p>}</div>}
      </nav>
    </header>
  );
}
