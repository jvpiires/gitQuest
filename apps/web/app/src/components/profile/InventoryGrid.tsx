"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@gitquest/database";
import { RARITY_META, type HeroClass } from "../../lib/game/progression";

const SLOT_ICON: Record<string, string> = {
  weapon: "⚔️",
  head: "🪖",
  body: "🥋",
  accessory: "💍",
};

const RARITY_GLOW: Record<string, string> = {
  COMMON: "shadow-none",
  RARE: "shadow-[0_0_12px_rgba(56,189,248,0.35)]",
  EPIC: "shadow-[0_0_16px_rgba(168,85,247,0.45)]",
  LEGENDARY: "shadow-[0_0_20px_rgba(245,158,11,0.55)]",
};

export default function InventoryGrid({ heroClass, refreshToken = 0 }: { heroClass: HeroClass; refreshToken?: number }) {
  const [items, setItems] = useState<
    Array<{ id: string; name: string; heroClass: string; slot: string; rarity: string; inventoryId: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState("ALL");
  const [slot, setSlot] = useState("ALL");

  useEffect(() => {
    let mounted = true;

    const loadInventory = async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch(`/api/inventory?heroClass=${encodeURIComponent(heroClass)}`, {
        cache: "no-store",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (!response.ok) {
        if (mounted) setItems([]);
        setLoading(false);
        return;
      }

      const payload = (await response.json()) as {
        items: Array<{
          inventoryId: string;
          id: string;
          name: string;
          heroClass: string;
          slot: string;
          rarity: string;
        }>;
      };

      if (mounted) {
        setItems(payload.items || []);
        setLoading(false);
      }
    };

    void loadInventory();

    return () => {
      mounted = false;
    };
  }, [heroClass, refreshToken]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const rarityOk = rarity === "ALL" || item.rarity === rarity;
      const slotOk = slot === "ALL" || item.slot === slot;
      const textOk = item.name.toLowerCase().includes(search.toLowerCase());
      return rarityOk && slotOk && textOk;
    });
  }, [items, rarity, search, slot]);

  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-mono text-lg font-black text-white">Inventario</h2>
        <span className="text-xs text-slate-400">{filteredItems.length} item(ns) no inventario</span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filtrar por nome..."
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
        />

        <select
          value={rarity}
          onChange={(event) => setRarity(event.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
        >
          <option value="ALL">Todas raridades</option>
          {Object.entries(RARITY_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>

        <select
          value={slot}
          onChange={(event) => setSlot(event.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
        >
          <option value="ALL">Todos slots</option>
          <option value="weapon">Arma</option>
          <option value="head">Cabeca</option>
          <option value="body">Corpo</option>
          <option value="accessory">Acessorio</option>
        </select>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
        {loading && (
          <div className="col-span-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-center text-sm text-slate-300">
            Carregando inventario...
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="col-span-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-center text-sm text-slate-300">
            Nenhum item encontrado para este heroi ainda.
          </div>
        )}

        {filteredItems.map((item) => (
          <div
            key={item.inventoryId}
            title={`${item.name} · ${RARITY_META[item.rarity as keyof typeof RARITY_META].label}`}
            className={`group relative aspect-square overflow-hidden rounded-xl border bg-slate-800 p-2 transition-transform hover:-translate-y-0.5 ${RARITY_GLOW[item.rarity] || "shadow-none"}`}
            style={{ borderColor: RARITY_META[item.rarity as keyof typeof RARITY_META].color }}
          >
            <div
              className="absolute inset-0 opacity-15"
              style={{ backgroundColor: RARITY_META[item.rarity as keyof typeof RARITY_META].color }}
            />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <span className="text-lg">{SLOT_ICON[item.slot] || "🎒"}</span>
              <div>
                <p className="truncate text-[9px] font-bold text-slate-100">{item.name}</p>
                <p className="text-[8px]" style={{ color: RARITY_META[item.rarity as keyof typeof RARITY_META].color }}>
                  {RARITY_META[item.rarity as keyof typeof RARITY_META].label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {Object.entries(RARITY_META).map(([key, meta]) => (
          <span key={key} className="rounded-full border px-2 py-1" style={{ borderColor: meta.color, color: meta.color }}>
            {meta.label} · {meta.chance}
          </span>
        ))}
      </div>
    </section>
  );
}
