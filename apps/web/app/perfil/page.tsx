"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  supabase,
  ITEMS_BY_ID,
  RARITY_UI,
  levelProgress,
  type GameItem,
  type ItemSlot,
  type User,
} from "@gitquest/database";

// Item que o jogador possui + se está equipado.
interface OwnedItem {
  item: GameItem;
  equipped: boolean;
}

// Ordem e rótulo dos slots exibidos.
const SLOTS: Array<{ slot: ItemSlot; label: string; emoji: string }> = [
  { slot: "HEAD", label: "Cabeça", emoji: "🎩" },
  { slot: "MAINHAND", label: "Mão Principal", emoji: "🗡️" },
  { slot: "OFFHAND", label: "Mão Secundária", emoji: "🛡️" },
  { slot: "BACK", label: "Costas", emoji: "🧥" },
  { slot: "AURA", label: "Aura", emoji: "✨" },
];

export default function PerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<User | null>(null);
  const [items, setItems] = useState<OwnedItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // Carrega a sessão, o personagem e os itens que ele possui.
  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const uid = session.user.id;

    // Busca o personagem e os itens EM PARALELO, selecionando apenas as
    // colunas necessárias (evita o custo do select *).
    const [profileRes, ownedRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, gitlab_username, class_type, current_level, total_xp")
        .eq("id", uid)
        .maybeSingle(),
      supabase
        .from("user_items")
        .select("item_id, equipped")
        .eq("user_id", uid),
    ]);

    if (!profileRes.data) {
      // Sem personagem ainda: manda forjar no dashboard.
      router.push("/dashboard");
      return;
    }

    setPlayer(profileRes.data as User);

    const resolved: OwnedItem[] = (ownedRes.data ?? [])
      .map((row) => ({
        item: ITEMS_BY_ID[row.item_id as string],
        equipped: Boolean(row.equipped),
      }))
      .filter((entry) => entry.item); // ignora ids desconhecidos

    setItems(resolved);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Equipa ou desequipa um item e recarrega o estado.
  const toggleEquip = async (item: GameItem, equip: boolean) => {
    if (!player) return;
    setBusy(item.id);

    try {
      const res = await fetch("/api/items/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: player.id, itemId: item.id, equip }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Falha ao equipar.");
      }
      await load();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao equipar item.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
        Carregando o baú de tesouros...
      </main>
    );
  }

  if (!player) return null;

  const equippedBySlot = new Map<string, OwnedItem>();
  for (const owned of items) {
    if (owned.equipped) equippedBySlot.set(owned.item.slot, owned);
  }

  const progress = levelProgress(player.total_xp);

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span>🎒</span> Perfil de {player.gitlab_username}
            </h1>
            <p className="text-slate-400 mt-1">
              {player.class_type} · {player.total_xp.toLocaleString("pt-BR")} XP
              totais
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-semibold transition-colors"
          >
            ← Voltar ao mundo
          </button>
        </div>

        {/* Barra de progresso de nível */}
        <section className="mb-10 bg-slate-950/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-end justify-between mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-400">
                Nível {progress.level}
              </span>
              <span className="text-xs text-slate-500">
                próximo: {progress.level + 1}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {Math.floor(progress.xpIntoLevel).toLocaleString("pt-BR")} /{" "}
              {progress.xpForNextLevel.toLocaleString("pt-BR")} XP
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-[width] duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 text-right">
            Faltam{" "}
            {Math.ceil(
              progress.xpForNextLevel - progress.xpIntoLevel,
            ).toLocaleString("pt-BR")}{" "}
            XP para o nível {progress.level + 1}
          </p>
        </section>

        {/* Slots equipados */}
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400 mb-4">
            Equipado
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {SLOTS.map(({ slot, label, emoji }) => {
              const equipped = equippedBySlot.get(slot);
              return (
                <div
                  key={slot}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col items-center gap-2 min-h-[120px] justify-center"
                >
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">
                    {label}
                  </span>
                  {equipped ? (
                    <>
                      <span className="text-4xl">{equipped.item.emoji}</span>
                      <span
                        className="text-xs font-semibold text-center"
                        style={{ color: RARITY_UI[equipped.item.rarity].hex }}
                      >
                        {equipped.item.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl opacity-30">{emoji}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Inventário */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400 mb-4">
            Inventário ({items.length})
          </h2>

          {items.length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              Você ainda não tem itens. Abra luckboxes no mundo para conquistar
              equipamentos da sua classe!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map(({ item, equipped }) => {
                let buttonLabel = equipped ? "Desequipar" : "Equipar";
                if (busy === item.id) buttonLabel = "...";
                return (
                <div
                  key={item.id}
                  className="bg-slate-950/60 border rounded-xl p-4 flex flex-col items-center gap-2 transition-colors"
                  style={{
                    borderColor: equipped
                      ? RARITY_UI[item.rarity].hex
                      : "#1e293b",
                  }}
                >
                  <span className="text-4xl">{item.emoji}</span>
                  <span
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: RARITY_UI[item.rarity].hex }}
                  >
                    {RARITY_UI[item.rarity].label}
                  </span>
                  <span className="text-sm font-semibold text-center">
                    {item.name}
                  </span>
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => toggleEquip(item, !equipped)}
                    className={`mt-1 w-full py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                      equipped
                        ? "bg-slate-700 hover:bg-slate-600"
                        : "bg-amber-600 hover:bg-amber-700"
                    }`}
                  >
                    {buttonLabel}
                  </button>
                </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
