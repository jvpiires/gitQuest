"use client";

import { useEffect, useState } from "react";
import { supabase } from "@gitquest/database";
import { ITEM_CATALOG, RARITY_META, type HeroClass } from "../../lib/game/progression";

export default function LuckboxOpener({
  heroClass,
  available,
  onOpened,
}: {
  heroClass: HeroClass;
  available: number;
  onOpened?: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const [availableBoxes, setAvailableBoxes] = useState(available || 0);
  const [drop, setDrop] = useState<typeof ITEM_CATALOG[number] | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadLuckboxSummary = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch("/api/luckboxes", {
        cache: "no-store",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (!response.ok) {
        if (mounted) setAvailableBoxes(available || 0);
        return;
      }

      const payload = (await response.json()) as { available?: number };
      if (mounted) setAvailableBoxes(payload.available || 0);
    };

    void loadLuckboxSummary();

    return () => {
      mounted = false;
    };
  }, [available]);

  const open = async () => {
    if (!availableBoxes || opening) return;
    setOpening(true);
    setDrop(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch("/api/luckboxes/open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ heroClass }),
      });

      const payload = (await response.json()) as {
        drop?: typeof ITEM_CATALOG[number];
        available?: number;
      };

      if (!response.ok || !payload.drop) {
        setOpening(false);
        return;
      }

      setDrop(payload.drop);
      setAvailableBoxes(payload.available || 0);
      onOpened?.();
    } finally {
      setOpening(false);
    }
  };

  return <section className="rounded-3xl border border-amber-300/30 bg-gradient-to-br from-amber-500/20 to-slate-900 p-5 text-center shadow-xl"><p className="font-mono text-sm text-amber-200">LUCKBOX</p><button onClick={open} disabled={!availableBoxes || opening} className={`mt-3 text-6xl transition ${opening ? "animate-bounce scale-125" : "hover:scale-110"} disabled:opacity-40`}>🎁</button><p className="mt-2 text-sm text-slate-300">{availableBoxes ? `${availableBoxes} caixa(s) disponivel(is)` : "Evolua para receber uma caixa"}</p>{drop && <div className="mt-4 animate-in zoom-in rounded-xl border bg-slate-950/80 p-3" style={{ borderColor: RARITY_META[drop.rarity].color }}><p className="text-xs text-slate-400">DROP!</p><p className="font-bold" style={{ color: RARITY_META[drop.rarity].color }}>{drop.name} · {RARITY_META[drop.rarity].label}</p></div>}</section>;
}
