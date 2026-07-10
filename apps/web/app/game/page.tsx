// apps/web/app/game/page.tsx
"use client";

import { useEffect, useState } from "react";
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

export default function GamePage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [heroes, setHeroes] = useState<WorldHero[]>([]);
  const [guilds, setGuilds] = useState<{ id: string; name: string; icon_url?: string | null }[]>([]);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        router.push("/");
      } else {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("id, github_username, total_xp, avatar_url, class_type, tech_stack")
          .eq("id", user.id)
          .maybeSingle();

        const playerProfile: PlayerProfile = currentProfile || {
          id: user.id,
          github_username: user.user_metadata?.user_name || user.email?.split("@")[0] || "aventureiro",
          total_xp: 0,
          class_type: "MAGE",
        };
        setProfile(playerProfile);

        const { data: worldProfiles } = await supabase
          .from("profiles")
          .select("id, github_username, total_xp, class_type")
          .order("total_xp", { ascending: false })
          .limit(12);

        const worldHeroes = (worldProfiles || []).map((worldProfile) => ({
          id: worldProfile.id,
          name: worldProfile.github_username,
          totalXp: worldProfile.total_xp || 0,
          heroClass: normalizeHeroClass(worldProfile.class_type),
          isCurrentPlayer: worldProfile.id === user.id,
        }));

        if (!worldHeroes.some((hero) => hero.isCurrentPlayer)) {
          worldHeroes.unshift({
            id: playerProfile.id,
            name: playerProfile.github_username,
            totalXp: playerProfile.total_xp || 0,
            heroClass: normalizeHeroClass(playerProfile.class_type),
            isCurrentPlayer: true,
          });
        }
        setHeroes(worldHeroes);
        const { data: worldGuilds } = await supabase.from("guilds").select("id, name, icon_url").order("name");
        setGuilds(worldGuilds || []);
      }
    };
    checkUser();
  }, [router]);

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
