"use client";

import { HERO_CLASSES, type HeroClass } from "../../lib/game/progression";
import ProfileAvatar from "./ProfileAvatar";

interface CharacterCustomizerProps {
  heroClass: HeroClass;
  outfit: "classic" | "midnight" | "royal";
  onClassChange: (heroClass: HeroClass) => void;
  onOutfitChange: (outfit: "classic" | "midnight" | "royal") => void;
}

export default function CharacterCustomizer({ heroClass, outfit, onClassChange, onOutfitChange }: CharacterCustomizerProps) {
  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
      <h2 className="font-mono text-lg font-black text-white">Personalizar avatar</h2>
      <p className="mt-1 text-sm text-slate-400">Escolha uma classe e um visual para o seu herói.</p>
      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <ProfileAvatar heroClass={heroClass} outfit={outfit} />
        <div className="w-full space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(HERO_CLASSES) as HeroClass[]).map((itemClass) => {
              const item = HERO_CLASSES[itemClass];
              return <button key={itemClass} onClick={() => onClassChange(itemClass)} className={`rounded-xl border p-3 text-left transition ${itemClass === heroClass ? "border-amber-300 bg-amber-400/15" : "border-slate-700 bg-slate-800 hover:border-slate-500"}`}>
                <span className="block text-lg">{item.icon}</span><span className="text-sm font-bold text-white">{item.label}</span>
              </button>;
            })}
          </div>
          <div className="flex gap-2">
            {(["classic", "midnight", "royal"] as const).map((itemOutfit) => <button key={itemOutfit} onClick={() => onOutfitChange(itemOutfit)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold capitalize ${outfit === itemOutfit ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{itemOutfit}</button>)}
          </div>
        </div>
      </div>
    </section>
  );
}
