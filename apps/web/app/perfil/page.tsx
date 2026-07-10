"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@gitquest/database";
import CharacterCustomizer from "../src/components/profile/CharacterCustomizer";
import InventoryGrid from "../src/components/profile/InventoryGrid";
import ProfileAvatar from "../src/components/profile/ProfileAvatar";
import ProfileStats from "../src/components/profile/ProfileStats";
import { getProgression, HERO_CLASSES, type HeroClass } from "../src/lib/game/progression";
import { normalizeHeroClass, type PlayerProfile } from "../src/lib/game/types";

type Outfit = "classic" | "midnight" | "royal";

export default function ProfilePage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [heroClass, setHeroClass] = useState<HeroClass>("MAGE");
  const [outfit, setOutfit] = useState<Outfit>("classic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, github_username, total_xp, avatar_url, class_type, tech_stack")
        .eq("id", user.id)
        .maybeSingle();
      const currentProfile: PlayerProfile = data || {
        id: user.id,
        github_username: user.user_metadata?.user_name || user.email?.split("@")[0] || "aventureiro",
        total_xp: 0,
        class_type: "MAGE",
      };
      setProfile(currentProfile);
      setHeroClass(normalizeHeroClass(currentProfile.class_type));
      const savedOutfit = window.localStorage.getItem(`gitquest-outfit-${user.id}`) as Outfit | null;
      if (savedOutfit === "classic" || savedOutfit === "midnight" || savedOutfit === "royal") setOutfit(savedOutfit);
    };
    void loadProfile();
  }, []);

  const saveCustomization = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ class_type: heroClass }).eq("id", profile.id);
    if (!error) {
      setProfile({ ...profile, class_type: heroClass });
      window.localStorage.setItem(`gitquest-outfit-${profile.id}`, outfit);
    }
    setSaving(false);
  };

  if (!profile) return <main className="flex min-h-screen items-center justify-center bg-slate-950 font-mono text-amber-300">Carregando herói...</main>;
  const progression = getProgression(profile.total_xp || 0);
  const hero = HERO_CLASSES[heroClass];

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a5f,transparent_45%),#0f172a] px-4 py-8 text-white sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex items-center justify-between"><Link href="/game" className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 font-mono text-sm text-slate-200 transition hover:border-cyan-300">← Voltar ao reino</Link><span className="font-mono text-sm text-amber-300">GitQuest · Perfil do herói</span></header>
      <section className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"><div className="grid gap-6 p-6 md:grid-cols-[220px_1fr]"><div className="flex justify-center"><ProfileAvatar heroClass={heroClass} outfit={outfit} /></div><div><p className="font-mono text-sm" style={{ color: hero.accent }}>{hero.icon} {hero.label}</p><h1 className="mt-1 text-3xl font-black sm:text-5xl">{profile.github_username}</h1><p className="mt-3 max-w-xl text-slate-400">Construa sua reputação no reino: commits, reviews, pipelines e missões se transformam em XP e equipamento.</p><div className="mt-4 flex flex-wrap gap-2">{(profile.tech_stack || []).map((tech) => <span key={tech} className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-cyan-200">{tech}</span>)}</div></div></div></section>
      <div className="mt-6 grid gap-6 lg:grid-cols-2"><ProfileStats heroClass={heroClass} totalXp={profile.total_xp || 0} {...progression} /><CharacterCustomizer heroClass={heroClass} outfit={outfit} onClassChange={setHeroClass} onOutfitChange={setOutfit} /></div>
      <div className="mt-4 flex justify-end"><button onClick={saveCustomization} disabled={saving} className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60">{saving ? "Salvando..." : "Salvar personalização"}</button></div>
      <div className="mt-6"><InventoryGrid heroClass={heroClass} /></div>
      <section className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-5"><h2 className="font-mono text-lg font-black">Regras de progressão</h2><div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3"><p><strong className="text-white">100 XP</strong><br />por commit sincronizado.</p><p><strong className="text-white">XP nível N = 50 × (N − 1)²</strong><br />curva quadrática infinita.</p><p><strong className="text-white">Classes</strong><br />{hero.xpTrigger} impulsionam {hero.attribute}.</p></div></section>
    </div>
  </main>;
}
