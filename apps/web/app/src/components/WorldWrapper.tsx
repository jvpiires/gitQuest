"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  supabase,
  ITEMS_BY_ID,
  type GameItem,
  type User,
} from "@gitquest/database";
import { type EquippedMap } from "./TibiaWorld";

// O dynamic com ssr: false é perfeitamente legal aqui dentro de um Client Component
const TibiaWorld = dynamic(() => import("./TibiaWorld"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-500 font-mono text-sm tracking-widest">
      CARREGANDO MUNDO...
    </div>
  ),
});

interface WorldWrapperProps {
  // Players vindos do servidor (podem chegar vazios se não houver sessão no server)
  players?: User[];
}

export function WorldWrapper({ players: initialPlayers = [] }: Readonly<WorldWrapperProps>) {
  const [players, setPlayers] = useState<User[]>(initialPlayers);
  const [equippedByUser, setEquippedByUser] = useState<EquippedMap>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const authMode = process.env.NEXT_PUBLIC_AUTH_MODE ?? "supabase";

  useEffect(() => {
    // Busca no cliente garante que os bonecos apareçam mesmo se o fetch do
    // servidor voltar vazio (RLS/sessão). Espelha a lógica do Leaderboard.
    async function fetchWorld() {
      if (authMode === "internal_gitlab") {
        const meRes = await fetch("/api/player/me");
        if (meRes.ok) {
          const me = (await meRes.json()) as { user?: { id?: string } };
          setCurrentUserId(me.user?.id ?? null);
        }
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setCurrentUserId(session?.user.id ?? null);
      }

      const [playersRes, itemsRes] = await Promise.all([
        supabase
          .from("users")
          .select("id, gitlab_username, class_type, current_level, total_xp"),
        supabase.from("user_items").select("user_id, item_id").eq("equipped", true),
      ]);

      if (!playersRes.error && playersRes.data && playersRes.data.length > 0) {
        setPlayers(playersRes.data);
      }

      // Monta o mapa userId -> itens equipados (resolvendo do catálogo).
      if (!itemsRes.error && itemsRes.data) {
        const map: EquippedMap = {};
        for (const row of itemsRes.data) {
          const item: GameItem | undefined = ITEMS_BY_ID[row.item_id as string];
          if (!item) continue;
          const uid = row.user_id as string;
          const list = map[uid] ?? [];
          list.push(item);
          map[uid] = list;
        }
        setEquippedByUser(map);
      }
    }

    fetchWorld();
  }, [authMode]);

  if (players.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-500 font-mono text-sm tracking-widest">
        INVOCANDO HERÓIS...
      </div>
    );
  }

  // A `key` força o Phaser a reinicializar quando a lista de players muda,
  // pois o useEffect interno do TibiaWorld não recria o jogo sozinho.
  return (
    <TibiaWorld
      key={players.length}
      players={players}
      equippedByUser={equippedByUser}
      currentUserId={currentUserId}
    />
  );
}