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

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? "supabase";

// Item que o jogador possui + se está equipado.
interface OwnedItem {
  item: GameItem;
  equipped: boolean;
}

interface AdminSuggestion {
  id: string;
  author_username: string;
  message: string;
  created_at: string;
}

const ADMIN_USERNAME = "joao.santos";

// Ordem e rótulo dos slots exibidos.
const SLOTS: Array<{ slot: ItemSlot; label: string; emoji: string }> = [
  { slot: "HEAD", label: "Cabeça", emoji: "🎩" },
  { slot: "MAINHAND", label: "Mão Principal", emoji: "🗡️" },
  { slot: "OFFHAND", label: "Mão Secundária", emoji: "🛡️" },
  { slot: "BACK", label: "Costas", emoji: "🧥" },
  { slot: "AURA", label: "Aura", emoji: "✨" },
];

const SLOT_LABEL: Record<ItemSlot, string> = {
  HEAD: "Cabeça",
  MAINHAND: "Mão Principal",
  OFFHAND: "Mão Secundária",
  BACK: "Costas",
  AURA: "Aura",
};

export default function PerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<User | null>(null);
  const [items, setItems] = useState<OwnedItem[]>([]);
  const [suggestions, setSuggestions] = useState<AdminSuggestion[]>([]);
  const [suggestionMsg, setSuggestionMsg] = useState("");
  const [suggestionFeedback, setSuggestionFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sendingSuggestion, setSendingSuggestion] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [rarityFilter, setRarityFilter] = useState<"ALL" | keyof typeof RARITY_UI>(
    "ALL",
  );
  const [slotFilter, setSlotFilter] = useState<"ALL" | ItemSlot>("ALL");
  const [equippedOnly, setEquippedOnly] = useState(false);

  const loadInternalProfile = useCallback(async () => {
    if (AUTH_MODE === "internal_gitlab") {
      const meRes = await fetch("/api/player/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }

      const me = (await meRes.json()) as {
        authenticated?: boolean;
        hasCharacter?: boolean;
        role?: "admin" | "player";
        user?: User;
      };

      if (!me.authenticated || !me.user?.id) {
        router.push("/login");
        return;
      }

      if (!me.hasCharacter) {
        router.push("");
        return;
      }

      setPlayer(me.user);

      const inventoryRes = await fetch("/api/player/inventory");
      if (!inventoryRes.ok) {
        throw new Error("Falha ao carregar inventário.");
      }

      const inventoryData = (await inventoryRes.json()) as {
        items?: Array<{ item_id: string; equipped: boolean }>;
      };

      const resolved: OwnedItem[] = (inventoryData.items ?? [])
        .map((row) => ({
          item: ITEMS_BY_ID[row.item_id],
          equipped: Boolean(row.equipped),
        }))
        .filter((entry) => entry.item);

      setItems(resolved);

      if (me.role === "admin") {
        const suggestionsRes = await fetch("/api/admin-suggestions");
        if (suggestionsRes.ok) {
          const suggestionsData = (await suggestionsRes.json()) as {
            suggestions?: AdminSuggestion[];
          };
          setSuggestions(suggestionsData.suggestions ?? []);
        }
      }

      setLoading(false);
    }
  }, [router]);

  const loadSupabaseProfile = useCallback(async () => {
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
      router.push("");
      return;
    }

    setPlayer(profileRes.data as User);

    const currentPlayer = profileRes.data as User;
    const isAdmin =
      currentPlayer.gitlab_username?.toLowerCase() === ADMIN_USERNAME;

    const resolved: OwnedItem[] = (ownedRes.data ?? [])
      .map((row) => ({
        item: ITEMS_BY_ID[row.item_id as string],
        equipped: Boolean(row.equipped),
      }))
      .filter((entry) => entry.item); // ignora ids desconhecidos

    setItems(resolved);

    if (isAdmin) {
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from("admin_suggestions")
        .select("id, author_username, message, created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      if (suggestionsError) {
        console.error("Erro ao carregar sugestões:", suggestionsError);
      } else {
        setSuggestions((suggestionsData ?? []) as AdminSuggestion[]);
      }
    }

    setLoading(false);
  }, [router]);

  // Carrega a sessão, o personagem e os itens que ele possui.
  const load = useCallback(async () => {
    if (AUTH_MODE === "internal_gitlab") {
      await loadInternalProfile();
      return;
    }

    await loadSupabaseProfile();
  }, [loadInternalProfile, loadSupabaseProfile]);

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

  const handleSendSuggestion = async () => {
    if (!player) return;

    const message = suggestionMsg.trim();
    if (message.length < 10) {
      setSuggestionFeedback("Escreva pelo menos 10 caracteres.");
      return;
    }

    setSendingSuggestion(true);
    setSuggestionFeedback(null);

    if (AUTH_MODE === "internal_gitlab") {
      try {
        const res = await fetch("/api/admin-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Não foi possível enviar sua sugestão.");
        }

        setSuggestionMsg("");
        setSuggestionFeedback("Sugestão enviada para o admin.");
      } catch (error) {
        console.error("Erro ao enviar sugestão:", error);
        setSuggestionFeedback(
          error instanceof Error ? error.message : "Não foi possível enviar sua sugestão.",
        );
      } finally {
        setSendingSuggestion(false);
      }
      return;
    }

    try {
      const { error } = await supabase.from("admin_suggestions").insert({
        author_id: player.id,
        author_username: player.gitlab_username,
        message,
      });

      if (error) {
        throw error;
      }

      setSuggestionMsg("");
      setSuggestionFeedback("Sugestão enviada para o admin.");
    } catch (error) {
      console.error("Erro ao enviar sugestão:", error);
      setSuggestionFeedback("Não foi possível enviar sua sugestão.");
    } finally {
      setSendingSuggestion(false);
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

  const isAdmin = player.gitlab_username?.toLowerCase() === ADMIN_USERNAME;

  const progress = levelProgress(player.total_xp);

  const filteredItems = items.filter(({ item, equipped }) => {
    const matchesName = item.name
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());
    const matchesRarity = rarityFilter === "ALL" || item.rarity === rarityFilter;
    const matchesSlot = slotFilter === "ALL" || item.slot === slotFilter;
    const matchesEquipped = !equippedOnly || equipped;

    return matchesName && matchesRarity && matchesSlot && matchesEquipped;
  });

  let inventoryContent: React.ReactNode;
  if (items.length === 0) {
    inventoryContent = (
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        Você ainda não tem itens. Abra luckboxes no mundo para conquistar
        equipamentos da sua classe!
      </div>
    );
  } else if (filteredItems.length === 0) {
    inventoryContent = (
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        Nenhum item encontrado com os filtros atuais.
      </div>
    );
  } else {
    inventoryContent = (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredItems.map(({ item, equipped }) => {
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
    );
  }

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

        {/* Sugestões para o admin */}
        {!isAdmin && (
          <section className="mb-10 bg-slate-950/60 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400 mb-3">
              Sugestão para o Admin
            </h2>
            <p className="text-sm text-slate-400 mb-3">
              Envie uma melhoria para {ADMIN_USERNAME}. As ideias ajudam a evoluir o jogo.
            </p>
            <textarea
              value={suggestionMsg}
              onChange={(e) => setSuggestionMsg(e.target.value)}
              placeholder="Ex.: adiciona missão diária com bônus de XP..."
              className="w-full min-h-[110px] rounded-lg bg-slate-900 border border-slate-700 p-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSendSuggestion}
                disabled={sendingSuggestion}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-slate-700 text-sm font-bold transition-colors"
              >
                {sendingSuggestion ? "Enviando..." : "Enviar sugestão"}
              </button>
              {suggestionFeedback && (
                <span className="text-xs text-slate-300">{suggestionFeedback}</span>
              )}
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="mb-10 bg-slate-950/60 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400 mb-4">
              Melhorias Sugeridas Pela Guilda
            </h2>
            {suggestions.length === 0 ? (
              <p className="text-sm text-slate-400">Ainda não chegaram sugestões.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        {s.author_username}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(s.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap">{s.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

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

          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar item por nome..."
                className="md:col-span-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              />

              <select
                value={rarityFilter}
                onChange={(e) =>
                  setRarityFilter(e.target.value as "ALL" | keyof typeof RARITY_UI)
                }
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Todas raridades</option>
                {Object.entries(RARITY_UI).map(([rarityKey, rarityMeta]) => (
                  <option key={rarityKey} value={rarityKey}>
                    {rarityMeta.label}
                  </option>
                ))}
              </select>

              <select
                value={slotFilter}
                onChange={(e) => setSlotFilter(e.target.value as "ALL" | ItemSlot)}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Todos slots</option>
                {SLOTS.map(({ slot }) => (
                  <option key={slot} value={slot}>
                    {SLOT_LABEL[slot]}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={equippedOnly}
                  onChange={(e) => setEquippedOnly(e.target.checked)}
                  className="accent-amber-500" />
                {" "}
                Somente equipados
              </label>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setRarityFilter("ALL");
                  setSlotFilter("ALL");
                  setEquippedOnly(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold uppercase tracking-wide text-slate-200"
              >
                Limpar filtros
              </button>
            </div>
          </div>

          {inventoryContent}
        </section>
      </div>
    </main>
  );
}
