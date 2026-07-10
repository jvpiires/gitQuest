"use client";

import Link from "next/link";
import { HERO_CLASSES, type HeroClass } from "../lib/game/progression";

interface GameHUDProps {
  username: string;
  heroClass: HeroClass;
  level: number;
  xp: number;
}

export default function GameHUD({ username, heroClass, level, xp }: GameHUDProps) {
  const hero = HERO_CLASSES[heroClass];
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4 text-white sm:p-6">
      <div className="rounded-2xl border border-slate-500/60 bg-slate-950/85 px-4 py-3 shadow-2xl backdrop-blur">
        <p className="font-mono text-sm text-amber-300">{hero.icon} {hero.label}</p>
        <h1 className="font-mono text-lg font-bold">{username}</h1>
        <p className="font-mono text-xs text-slate-300">Nível {level} · {xp.toLocaleString("pt-BR")} XP</p>
      </div>
      <nav className="pointer-events-auto flex gap-2">
        <Link href="/perfil" className="rounded-xl border border-amber-300/40 bg-amber-500 px-4 py-3 font-mono text-sm font-bold text-slate-950 shadow-lg transition hover:bg-amber-300">
          Meu perfil
        </Link>
      </nav>
    </header>
  );
}
