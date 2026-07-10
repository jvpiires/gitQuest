"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@gitquest/database";
import CharacterCustomizer from "../src/components/profile/CharacterCustomizer";
import GuildSelector from "../src/components/profile/GuildSelector";
import InventoryGrid from "../src/components/profile/InventoryGrid";
import LuckboxOpener from "../src/components/profile/LuckboxOpener";
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
  const [guilds, setGuilds] = useState<{ id: string; name: string; icon_url?: string | null; department?: string | null }[]>([]);
  const [memberGuildIds, setMemberGuildIds] = useState<string[]>([]);
  const [busyGuildId, setBusyGuildId] = useState<string>();
  const [feedback, setFeedback] = useState<string>();

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, github_username, total_xp, avatar_url, class_type, tech_stack, avatar_style")
        .eq("id", user.id)
        .maybeSingle();
      const currentProfile: PlayerProfile = data || {
        id: user.id,
        github_username: user.user_metadata?.user_name || user.email?.split("@")[0] || "aventureiro",
        total_xp: 0,
      class_type: "MAGE",
        avatar_style: "classic",
      };
      setProfile(currentProfile);
      setHeroClass(normalizeHeroClass(currentProfile.class_type));
      const savedOutfit = window.localStorage.getItem(`gitquest-outfit-${user.id}`) as Outfit | null;
      if (savedOutfit === "classic" || savedOutfit === "midnight" || savedOutfit === "royal") setOutfit(savedOutfit);
      const [{ data: availableGuilds }, { data: memberships }] = await Promise.all([
        supabase.from("guilds").select("id, name, icon_url, department").order("name"),
        supabase.from("guild_members").select("guild_id").eq("user_id", user.id),
      ]);
      setGuilds(availableGuilds || []);
      setMemberGuildIds((memberships || []).map((membership) => membership.guild_id));
    };
    void loadProfile();
  }, []);

  const saveCustomization = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ class_type: heroClass, avatar_style: outfit }).eq("id", profile.id);
    if (!error) {
      setProfile({ ...profile, class_type: heroClass, avatar_style: outfit });
      window.localStorage.setItem(`gitquest-outfit-${profile.id}`, outfit);
      setFeedback("Personalização salva.");
    } else {
      setFeedback(`Não foi possível salvar: ${error.message}`);
    }
    setSaving(false);
  };

  const changeClass = async (nextClass: HeroClass) => {
    if (!profile || nextClass === heroClass) return;
    const previousClass = heroClass;
    setHeroClass(nextClass);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ class_type: nextClass, avatar_style: outfit }).eq("id", profile.id);
    setSaving(false);
    if (error) {
      setHeroClass(previousClass);
      setFeedback(`Não foi possível trocar a classe: ${error.message}`);
      return;
    }
    setProfile({ ...profile, class_type: nextClass, avatar_style: outfit });
    setFeedback(`${HERO_CLASSES[nextClass].label} equipado.`);
  };

  const toggleGuild = async (guildId: string, isMember: boolean) => {
    if (!profile) return;
    setBusyGuildId(guildId);
    const { error } = isMember
      ? await supabase.from("guild_members").delete().eq("guild_id", guildId).eq("user_id", profile.id)
      : await supabase.from("guild_members").insert({ guild_id: guildId, user_id: profile.id });
    setBusyGuildId(undefined);
    if (error) { setFeedback(`Não foi possível atualizar a guilda: ${error.message}`); return; }
    setMemberGuildIds((current) => isMember ? current.filter((id) => id !== guildId) : [...current, guildId]);
    setFeedback(isMember ? "Você saiu da guilda." : "Você entrou na guilda.");
  };

  if (!profile) return <main className="flex min-h-screen items-center justify-center bg-slate-950 font-mono text-amber-300">Carregando herói...</main>;
  const progression = getProgression(profile.total_xp || 0);
  const hero = HERO_CLASSES[heroClass];

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a5f,transparent_45%),#0f172a] px-4 py-8 text-white sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex items-center justify-between"><Link href="/game" className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 font-mono text-sm text-slate-200 transition hover:border-cyan-300">← Voltar ao reino</Link><span className="font-mono text-sm text-amber-300">GitQuest · Perfil do herói</span></header>
      <section className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"><div className="grid gap-6 p-6 md:grid-cols-[220px_1fr]"><div className="flex justify-center"><ProfileAvatar heroClass={heroClass} outfit={outfit} avatarUrl={profile.avatar_url} /></div><div><p className="font-mono text-sm" style={{ color: hero.accent }}>{hero.icon} {hero.label}</p><h1 className="mt-1 text-3xl font-black sm:text-5xl">{profile.github_username}</h1><p className="mt-3 max-w-xl text-slate-400">Construa sua reputação no reino: commits, reviews, pipelines e missões se transformam em XP e equipamento.</p><div className="mt-4 flex flex-wrap gap-2">{(profile.tech_stack || []).map((tech) => <span key={tech} className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-cyan-200">#{tech}</span>)}</div></div></div></section>
      <div className="mt-6 grid gap-6 lg:grid-cols-3"><ProfileStats heroClass={heroClass} totalXp={profile.total_xp || 0} {...progression} /><CharacterCustomizer heroClass={heroClass} outfit={outfit} onClassChange={changeClass} onOutfitChange={setOutfit} /><LuckboxOpener heroClass={heroClass} available={progression.luckboxesEarned} /></div>
      <div className="mt-4 flex items-center justify-end gap-4"><p className="text-sm text-cyan-200">{feedback}</p><button onClick={saveCustomization} disabled={saving} className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60">{saving ? "Salvando..." : "Salvar visual"}</button></div>
      <div className="mt-6"><GuildSelector guilds={guilds} memberGuildIds={memberGuildIds} busyGuildId={busyGuildId} onToggle={toggleGuild} /></div>
      <div className="mt-6"><InventoryGrid heroClass={heroClass} /></div>
      <section className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-5"><h2 className="font-mono text-lg font-black">Regras de progressão</h2><div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3"><p><strong className="text-white">100 XP</strong><br />por commit sincronizado.</p><p><strong className="text-white">XP nível N = 50 × (N − 1)²</strong><br />curva quadrática infinita.</p><p><strong className="text-white">Classes</strong><br />{hero.xpTrigger} impulsionam {hero.attribute}.</p></div></section>
    </div>
  </main>;
}
