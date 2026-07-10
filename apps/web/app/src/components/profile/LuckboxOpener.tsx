"use client";

import { useState } from "react";
import { ITEM_CATALOG, RARITY_META, rollRarity, type HeroClass } from "../../lib/game/progression";

export default function LuckboxOpener({ heroClass, available }: { heroClass: HeroClass; available: number }) {
  const [opening, setOpening] = useState(false);
  const [drop, setDrop] = useState<typeof ITEM_CATALOG[number] | null>(null);
  const open = () => {
    if (!available || opening) return;
    setOpening(true); setDrop(null);
    window.setTimeout(() => {
      const rarity = rollRarity();
      const options = ITEM_CATALOG.filter((item) => item.heroClass === heroClass && item.rarity === rarity);
      setDrop(options[Math.floor(Math.random() * options.length)]); setOpening(false);
    }, 1100);
  };
  return <section className="rounded-3xl border border-amber-300/30 bg-gradient-to-br from-amber-500/20 to-slate-900 p-5 text-center shadow-xl"><p className="font-mono text-sm text-amber-200">LUCKBOX</p><button onClick={open} disabled={!available || opening} className={`mt-3 text-6xl transition ${opening ? "animate-bounce scale-125" : "hover:scale-110"} disabled:opacity-40`}>🎁</button><p className="mt-2 text-sm text-slate-300">{available ? `${available} caixa(s) disponível(is)` : "Evolua para receber uma caixa"}</p>{drop && <div className="mt-4 animate-in zoom-in rounded-xl border bg-slate-950/80 p-3" style={{ borderColor: RARITY_META[drop.rarity].color }}><p className="text-xs text-slate-400">DROP!</p><p className="font-bold" style={{ color: RARITY_META[drop.rarity].color }}>{drop.name} · {RARITY_META[drop.rarity].label}</p></div>}</section>;
}
