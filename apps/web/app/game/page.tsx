"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@gitquest/database";
import { useRouter } from "next/navigation";
import GameHUD from "../src/components/GameHUD";
import { getProgression } from "../src/lib/game/progression";
import { normalizeHeroClass, type PlayerProfile, type WorldHero } from "../src/lib/game/types";

const GameWorld = dynamic(() => import("../src/components/GameWorld"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-black text-amber-500 font-nordic text-4xl">
      Carregando o Reino...
    </div>
  ),
});

const githubAvatarFromUsername = (username?: string | null) => {
  if (!username) return null;
  return `https://avatars.githubusercontent.com/${encodeURIComponent(username)}?size=128`;
};

export default function GamePage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [heroes, setHeroes] = useState<WorldHero[]>([]);
  const [guilds, setGuilds] = useState<{ id: string; name: string; icon_url?: string | null }[]>([]);
  const router = useRouter();

  const loadGameData = useCallback(
    async (userId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch("/api/game/bootstrap", {
        cache: "no-store",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!response.ok) {
        if (response.status === 401) router.push("/");
        return;
      }

      const payload = (await response.json()) as {
        profile: PlayerProfile;
        world: Array<{
          id: string;
          github_username: string;
          total_xp: number;
          class_type?: string | null;
          avatar_style?: string | null;
          avatar_url?: string | null;
          isCurrentPlayer?: boolean;
        }>;
        guilds: { id: string; name: string; icon_url?: string | null }[];
      };

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return;

      const playerProfile: PlayerProfile = payload.profile || {
        id: user.id,
        github_username: user.user_metadata?.user_name || user.email?.split("@")[0] || "aventureiro",
        total_xp: 0,
        class_type: "MAGE",
        avatar_style: "classic",
        avatar_url: githubAvatarFromUsername(user.user_metadata?.user_name || user.user_metadata?.preferred_username),
      };

      if (!playerProfile.avatar_url) {
        playerProfile.avatar_url = githubAvatarFromUsername(playerProfile.github_username);
      }

      const worldHeroes: WorldHero[] = (payload.world || []).map((worldProfile) => ({
        id: worldProfile.id,
        name: worldProfile.github_username,
        totalXp: worldProfile.total_xp || 0,
        heroClass: normalizeHeroClass(worldProfile.class_type),
        outfit:
          worldProfile.avatar_style === "midnight" || worldProfile.avatar_style === "royal"
            ? worldProfile.avatar_style
            : "classic",
        avatarUrl: worldProfile.avatar_url || githubAvatarFromUsername(worldProfile.github_username),
        isCurrentPlayer: worldProfile.id === user.id,
      }));

      if (!worldHeroes.some((hero) => hero.isCurrentPlayer)) {
        worldHeroes.unshift({
          id: playerProfile.id,
          name: playerProfile.github_username,
          totalXp: playerProfile.total_xp || 0,
          heroClass: normalizeHeroClass(playerProfile.class_type),
          outfit:
            playerProfile.avatar_style === "midnight" || playerProfile.avatar_style === "royal"
              ? playerProfile.avatar_style
              : "classic",
          avatarUrl: playerProfile.avatar_url || githubAvatarFromUsername(playerProfile.github_username),
          isCurrentPlayer: true,
        });
      }

      setProfile(playerProfile);
      setHeroes(worldHeroes);
      setGuilds(payload.guilds || []);
    },
    [router]
  );

  useEffect(() => {
    let mounted = true;
    let profileChannel: ReturnType<typeof supabase.channel> | undefined;

    const setup = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.push("/");
        return;
      }

      if (!mounted) return;
      await loadGameData(user.id);

      profileChannel = supabase
        .channel(`profile-live-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          async () => {
            await loadGameData(user.id);
          }
        )
        .subscribe();

      const onFocus = async () => {
        await loadGameData(user.id);
      };

      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void onFocus();
      });

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
  }, [loadGameData, router]);

  if (!profile) return null;

  const heroClass = normalizeHeroClass(profile.class_type);
  const progression = getProgression(profile.total_xp || 0);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-slate-950">
      <GameWorld heroes={heroes} />
      <GameHUD
        username={profile.github_username}
        heroClass={heroClass}
        level={progression.level}
        xp={profile.total_xp || 0}
        leaderboard={heroes}
        guilds={guilds}
      />
    </main>
  );
}
