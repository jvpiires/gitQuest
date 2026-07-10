"use client";

import { HERO_CLASSES, LEVELS_PER_BOX, type HeroClass } from "../../lib/game/progression";

interface ProfileStatsProps {
  heroClass: HeroClass;
  totalXp: number;
  level: number;
  progressPercent: number;
  xpRemaining: number;
  luckboxesEarned: number;
  levelsUntilNextLuckbox: number;
}

export default function ProfileStats(props: ProfileStatsProps) {
  const hero = HERO_CLASSES[props.heroClass];

  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
      <p className="font-mono text-sm" style={{ color: hero.accent }}>
        {hero.icon} {hero.label} · atributo: {hero.attribute}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900 p-3">
          <p className="text-2xl font-black text-white">{props.level}</p>
          <p className="text-xs uppercase tracking-wide text-slate-400">Nivel</p>
        </div>
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/10 to-blue-500/5 p-3">
          <p className="text-2xl font-black text-cyan-300">{props.totalXp.toLocaleString("pt-BR")}</p>
          <p className="text-xs uppercase tracking-wide text-slate-400">XP total</p>
        </div>
        <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-400/10 to-orange-500/5 p-3">
          <p className="text-2xl font-black text-amber-300">{props.luckboxesEarned}</p>
          <p className="text-xs uppercase tracking-wide text-slate-400">Luckboxes</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs font-mono text-slate-300">
          <span>Proximo nivel</span>
          <span>{props.xpRemaining.toLocaleString("pt-BR")} XP restantes</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
            style={{ width: `${props.progressPercent}%` }}
          />
        </div>
      </div>

      <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100">
        🎁 Uma luckbox a cada {LEVELS_PER_BOX} niveis. Faltam {props.levelsUntilNextLuckbox} nivel(is) para a proxima.
      </p>
    </section>
  );
}
