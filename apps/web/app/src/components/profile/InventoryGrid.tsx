"use client";

import { ITEM_CATALOG, RARITY_META, type HeroClass } from "../../lib/game/progression";

export default function InventoryGrid({ heroClass }: { heroClass: HeroClass }) {
  const items = ITEM_CATALOG.filter((item) => item.heroClass === heroClass);
  return <section className="rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-xl"><div className="flex items-baseline justify-between"><h2 className="font-mono text-lg font-black text-white">Inventário</h2><span className="text-xs text-slate-400">20 itens da classe</span></div><div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">{items.map((item) => <div key={item.id} title={`${item.name} · ${RARITY_META[item.rarity].label}`} className="aspect-square rounded-xl border bg-slate-800 p-2" style={{ borderColor: RARITY_META[item.rarity].color }}><span className="text-lg">{item.slot === "weapon" ? "⚔️" : item.slot === "head" ? "🪖" : item.slot === "body" ? "🥋" : "💍"}</span><p className="mt-1 truncate text-[9px] font-bold text-slate-200">{item.name}</p><p className="text-[8px]" style={{ color: RARITY_META[item.rarity].color }}>{RARITY_META[item.rarity].label}</p></div>)}</div><div className="mt-4 flex flex-wrap gap-3 text-xs">{Object.entries(RARITY_META).map(([rarity, meta]) => <span key={rarity} style={{ color: meta.color }}>{meta.label} {meta.chance}</span>)}</div></section>;
}
