"use client";

import { HERO_CLASSES, type HeroClass } from "../../lib/game/progression";

interface ProfileAvatarProps {
  heroClass: HeroClass;
  outfit: "classic" | "midnight" | "royal";
  size?: "sm" | "lg";
  avatarUrl?: string | null;
}

export default function ProfileAvatar({ heroClass, outfit, size = "lg", avatarUrl }: ProfileAvatarProps) {
  const hero = HERO_CLASSES[heroClass];
  const scale = size === "lg" ? "scale-[1.65]" : "scale-100";
  const outfitColor = outfit === "midnight" ? "#111827" : outfit === "royal" ? "#f59e0b" : hero.color;

  return (
    <div className={`relative h-36 w-28 ${size === "lg" ? "sm:h-52 sm:w-40" : ""} overflow-hidden rounded-2xl bg-gradient-to-b from-sky-300 to-cyan-500`}>
      <div className={`absolute bottom-7 left-1/2 h-20 w-12 -translate-x-1/2 ${scale}`}>
        {avatarUrl ? <img src={avatarUrl} alt="" className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-slate-800 bg-[#ffd6b0] object-cover" /> : <div className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-slate-800 bg-[#ffd6b0]" />}
        <div className="absolute left-1/2 top-7 h-5 w-10 -translate-x-1/2 rounded-t-full border-2 border-slate-800 bg-slate-900" />
        <div className="absolute left-1/2 top-9 h-11 w-10 -translate-x-1/2 rounded-md border-2 border-slate-800" style={{ backgroundColor: outfitColor }} />
        <div className="absolute bottom-0 left-[9px] h-5 w-3 rounded border-2 border-slate-800 bg-slate-900" />
        <div className="absolute bottom-0 right-[9px] h-5 w-3 rounded border-2 border-slate-800 bg-slate-900" />
      </div>
      <span className="absolute bottom-2 left-2 rounded bg-slate-950/80 px-2 py-1 text-xs font-bold text-white">{hero.icon} {hero.label}</span>
    </div>
  );
}
