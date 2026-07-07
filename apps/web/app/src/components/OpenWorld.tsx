"use client";

import { useEffect, useState } from "react";
import { supabase, type User } from "@gitquest/database";
import { PlayerAvatar } from "./PlayerAvatar";

export function OpenWorld() {
  const [players, setPlayers] = useState<User[]>([]);

  useEffect(() => {
    async function spawnPlayers() {
      const { data, error } = await supabase
        .from("users")
        .select("*");

      if (data && !error) {
        setPlayers(data);
      }
    }

    spawnPlayers();
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      {players.map(player => (
        <PlayerAvatar key={player.id} player={player} />
      ))}
    </div>
  );
}