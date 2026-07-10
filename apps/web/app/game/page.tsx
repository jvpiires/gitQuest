// apps/web/app/game/page.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@gitquest/database";
import { useRouter } from "next/navigation";

const GameWorld = dynamic(() => import("../src/components/GameWorld"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-black text-amber-500 font-nordic text-4xl">
      Carregando o Reino...
    </div>
  ),
});

export default function GamePage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/");
      } else {
        setUser(data.user);
      }
    };
    checkUser();
  }, [router]);

  if (!user) return null;

  return (
    <main className="w-full h-screen bg-black">
      {/* O Motor do Jogo rodando em tela cheia */}
      <GameWorld />
    </main>
  );
}