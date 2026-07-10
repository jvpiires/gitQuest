"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@gitquest/database";
import { savePlayerCustomizationAction, setPlayerGuildAction } from "../src/lib/actions";
import CharacterCustomizer from "../src/components/profile/CharacterCustomizer";
import GuildSelector from "../src/components/profile/GuildSelector";
import InventoryGrid from "../src/components/profile/InventoryGrid";
import LuckboxOpener from "../src/components/profile/LuckboxOpener";
import ProfileAvatar from "../src/components/profile/ProfileAvatar";
import ProfileStats from "../src/components/profile/ProfileStats";
import { getProgression, HERO_CLASSES, type HeroClass } from "../src/lib/game/progression";
import { normalizeHeroClass, type PlayerProfile } from "../src/lib/game/types";

type Outfit = "classic" | "midnight" | "royal";

const isValidOutfit = (value?: string | null): value is Outfit => {
  return value === "classic" || value === "midnight" || value === "royal";
};

const githubAvatarFromUsername = (username?: string | null) => {
  if (!username) return undefined;
  return `https://avatars.githubusercontent.com/${encodeURIComponent(username)}?size=128`;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [heroClass, setHeroClass] = useState<HeroClass>("MAGE");
  const [outfit, setOutfit] = useState<Outfit>("classic");
  const [saving, setSaving] = useState(false);
  const [guilds, setGuilds] = useState<{ id: string; name: string; icon_url?: string | null; department?: string | null }[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>();
  const [busyGuildId, setBusyGuildId] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const [inventoryRefreshToken, setInventoryRefreshToken] = useState(0);

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    const response = await fetch("/api/game/bootstrap", {
      cache: "no-store",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });

    if (!response.ok) {
      throw new Error(`Falha ao carregar perfil (${response.status})`);
    }

    const payload = (await response.json()) as {
      profile?: PlayerProfile;
      guilds?: { id: string; name: string; icon_url?: string | null; department?: string | null }[];
      currentGuildId?: string | null;
    };

    const currentProfile: PlayerProfile = payload.profile || {
      id: user.id,
      github_username: user.user_metadata?.user_name || user.email?.split("@")[0] || "aventureiro",
      total_xp: 0,
      class_type: "MAGE",
      avatar_style: "classic",
    };

    setProfile(currentProfile);
    setHeroClass(normalizeHeroClass(currentProfile.class_type));

    if (isValidOutfit(currentProfile.avatar_style)) {
      setOutfit(currentProfile.avatar_style);
      window.localStorage.setItem(`gitquest-outfit-${user.id}`, currentProfile.avatar_style);
    } else {
      const savedOutfit = window.localStorage.getItem(`gitquest-outfit-${user.id}`) as Outfit | null;
      if (savedOutfit && isValidOutfit(savedOutfit)) setOutfit(savedOutfit);
      else setOutfit("classic");
    }

    setGuilds(payload.guilds || []);
    setSelectedGuildId(payload.currentGuildId || undefined);

    return user;
  }, []);

  useEffect(() => {
    let mounted = true;
    let profileChannel: ReturnType<typeof supabase.channel> | undefined;

    const setup = async () => {
      const user = await loadProfile();
      if (!user || !mounted) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        await fetch("/api/sync-xp", {
          method: "POST",
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });

        await loadProfile();
      } catch (error) {
        console.error("Falha na sincronização automática do perfil:", error);
      }

      profileChannel = supabase
        .channel(`perfil-live-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          async () => {
            await loadProfile();
          }
        )
        .subscribe();

      const onFocus = async () => {
        await loadProfile();
      };

      window.addEventListener("focus", onFocus);
      return () => {
        window.removeEventListener("focus", onFocus);
      };
    };

    const cleanupPromise = setup();

    return () => {
      mounted = false;
      void cleanupPromise.then((cleanup) => cleanup && cleanup());
      if (profileChannel) void supabase.removeChannel(profileChannel);
    };
  }, [loadProfile]);

  const saveCustomization = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await savePlayerCustomizationAction(profile.id, heroClass, outfit);
      const { error: fallbackError } = await supabase
        .from("profiles")
        .update({ class_type: heroClass, avatar_style: outfit })
        .eq("id", profile.id);
      if (fallbackError) throw new Error(fallbackError.message);

      await loadProfile();
      setProfile({ ...profile, class_type: heroClass, avatar_style: outfit });
      window.localStorage.setItem(`gitquest-outfit-${profile.id}`, outfit);
      setFeedback("Personalização salva.");
    } catch (error) {
      setFeedback(`Não foi possível salvar: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    }
    setSaving(false);
  };

  const changeClass = async (nextClass: HeroClass) => {
    if (!profile || nextClass === heroClass) return;

    const previousClass = heroClass;
    setHeroClass(nextClass);
    setSaving(true);

    let error: Error | undefined;
    try {
      await savePlayerCustomizationAction(profile.id, nextClass, outfit);
      const { error: fallbackError } = await supabase
        .from("profiles")
        .update({ class_type: nextClass, avatar_style: outfit })
        .eq("id", profile.id);
      if (fallbackError) throw new Error(fallbackError.message);

      await loadProfile();
    } catch (cause) {
      error = cause instanceof Error ? cause : new Error("erro desconhecido");
    }

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
    let error: Error | undefined;

    try {
      await setPlayerGuildAction(profile.id, isMember ? null : guildId);
    } catch (cause) {
      error = cause instanceof Error ? cause : new Error("erro desconhecido");
    }

    setBusyGuildId(undefined);

    if (error) {
      setFeedback(`Não foi possível atualizar a guilda: ${error.message}`);
      return;
    }

    setSelectedGuildId(isMember ? undefined : guildId);
    setFeedback(isMember ? "Você saiu da guilda." : "Você entrou na guilda.");
  };

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 font-mono text-amber-300">
        Carregando herói...
      </main>
    );
  }

  const progression = getProgression(profile.total_xp || 0);
  const hero = HERO_CLASSES[heroClass];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a5f,transparent_45%),#0f172a] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <Link
            href="/game"
            className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 font-mono text-sm text-slate-200 transition hover:border-cyan-300"
          >
            ← Voltar ao reino
          </Link>
          <span className="font-mono text-sm text-amber-300">GitQuest · Perfil do herói</span>
        </header>

        <section className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="grid gap-6 p-6 md:grid-cols-[220px_1fr]">
            <div className="flex justify-center">
              <ProfileAvatar
                heroClass={heroClass}
                outfit={outfit}
                avatarUrl={profile.avatar_url || githubAvatarFromUsername(profile.github_username)}
              />
            </div>
            <div>
              <p className="font-mono text-sm" style={{ color: hero.accent }}>
                {hero.icon} {hero.label}
              </p>
              <h1 className="mt-1 text-3xl font-black sm:text-5xl">{profile.github_username}</h1>
              <p className="mt-3 max-w-xl text-slate-400">
                Construa sua reputação no reino: commits, reviews, pipelines e missões se transformam em XP e equipamento.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(profile.tech_stack || []).map((tech) => (
                  <span key={tech} className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-cyan-200">
                    #{tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <ProfileStats heroClass={heroClass} totalXp={profile.total_xp || 0} {...progression} />
          <CharacterCustomizer
            heroClass={heroClass}
            outfit={outfit}
            onClassChange={changeClass}
            onOutfitChange={setOutfit}
          />
          <LuckboxOpener
            heroClass={heroClass}
            available={progression.luckboxesEarned}
            onOpened={() => setInventoryRefreshToken((value) => value + 1)}
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-4">
          <p className="text-sm text-cyan-200">{feedback}</p>
          <button
            onClick={saveCustomization}
            disabled={saving}
            className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar visual"}
          </button>
        </div>

        <div className="mt-6">
          <GuildSelector
            guilds={guilds}
            selectedGuildId={selectedGuildId}
            busyGuildId={busyGuildId}
            onToggle={toggleGuild}
          />
        </div>

        <div className="mt-6">
          <InventoryGrid heroClass={heroClass} refreshToken={inventoryRefreshToken} />
        </div>

        <section className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="font-mono text-lg font-black">Regras de progressão</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <p>
              <strong className="text-white">100 XP</strong>
              <br />
              por commit sincronizado.
            </p>
            <p>
              <strong className="text-white">XP nível N = 50 × (N − 1)²</strong>
              <br />
              curva quadrática infinita.
            </p>
            <p>
              <strong className="text-white">Classes</strong>
              <br />
              {hero.xpTrigger} impulsionam {hero.attribute}.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
