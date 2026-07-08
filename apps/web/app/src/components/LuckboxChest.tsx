"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  RARITY_UI,
  type GameItem,
  type Rarity,
} from "@gitquest/database";

type Phase = "idle" | "opening" | "revealed";

interface OpenResult {
  item: GameItem;
  duplicate: boolean;
  available_boxes: number;
}

// Baú no canto inferior esquerdo. Ao abrir, dispara a animação da luckbox
// (luzes, brilho e revelação do item) estilo Vampire Survivors.
export function LuckboxChest() {
  const [userId, setUserId] = useState<string | null>(null);
  const [availableBoxes, setAvailableBoxes] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<OpenResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carrega a sessão e o saldo de luckboxes do jogador logado.
  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Só ativa o baú se a sessão tiver um personagem na tabela users.
      // Sem isso, um usuário logado sem personagem tentaria abrir e receberia 404.
      const { data, error } = await supabase
        .from("users")
        .select("available_boxes")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error || !data) return;

      setUserId(session.user.id);
      setAvailableBoxes(data.available_boxes ?? 0);

      // Sincroniza a XP retroativa do GitLab a cada reload. Ao ganhar níveis,
      // o servidor concede novas luckboxes; então relemos o saldo atualizado.
      try {
        const res = await fetch("/api/sync-xp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: session.user.id }),
        });
        if (res.ok) {
          const { data: refreshed } = await supabase
            .from("users")
            .select("available_boxes")
            .eq("id", session.user.id)
            .maybeSingle();
          if (refreshed) setAvailableBoxes(refreshed.available_boxes ?? 0);
        }
      } catch (err) {
        console.error("Falha ao sincronizar XP:", err);
      }
    }

    load();
  }, []);

  const openBox = async () => {
    if (!userId || availableBoxes <= 0 || phase === "opening") return;

    setError(null);
    setPhase("opening");
    setResult(null);

    try {
      const res = await fetch("/api/luckbox/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json()) as OpenResult & { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Falha ao abrir a luckbox.");
      }

      // Segura a animação de "abrindo" por um instante antes de revelar.
      setTimeout(() => {
        setResult(data);
        setAvailableBoxes(data.available_boxes);
        setPhase("revealed");
      }, 1800);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
      setPhase("idle");
    }
  };

  const close = () => {
    setPhase("idle");
    setResult(null);
  };

  // Não renderiza nada se o jogador não estiver logado.
  if (!userId) return null;

  return (
    <>
      {/* Baú fixo no canto inferior esquerdo. */}
      <button
        type="button"
        onClick={openBox}
        disabled={availableBoxes <= 0}
        className="fixed bottom-6 left-6 z-40 group flex flex-col items-center gap-2 focus:outline-none disabled:cursor-not-allowed"
      >
        <div
          className={`relative text-6xl transition-transform ${
            availableBoxes > 0
              ? "animate-bounce group-hover:scale-110 drop-shadow-[0_0_18px_rgba(250,204,21,0.8)]"
              : "opacity-50 grayscale"
          }`}
        >
          🎁
          {availableBoxes > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-slate-900">
              {availableBoxes}
            </span>
          )}
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-slate-950/70 px-3 py-1 rounded-full border border-amber-700/40">
          {availableBoxes > 0 ? "Abrir Luckbox" : "Sem caixas"}
        </span>
      </button>

      {/* Overlay da animação de abertura / revelação. */}
      {(phase === "opening" || phase === "revealed") && (
        <LuckboxOverlay phase={phase} result={result} onClose={close} />
      )}

      {error && (
        <div className="fixed bottom-28 left-6 z-40 bg-red-950/90 border border-red-700 text-red-200 text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}
    </>
  );
}

// --- Overlay com o "charme" da luckbox: luzes, brilho e item revelado ---
function LuckboxOverlay({
  phase,
  result,
  onClose,
}: Readonly<{
  phase: Phase;
  result: OpenResult | null;
  onClose: () => void;
}>) {
  const rarity: Rarity = result?.item.rarity ?? "COMMON";
  const rarityColor = RARITY_UI[rarity].hex;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Raios de luz girando ao fundo (efeito de destaque). */}
      <div
        className="absolute w-[140vmax] h-[140vmax] opacity-30 animate-[spin_8s_linear_infinite]"
        style={{
          background: `conic-gradient(from 0deg, transparent 0 10deg, ${rarityColor}55 10deg 20deg, transparent 20deg 30deg)`,
        }}
      />

      {phase === "opening" && (
        <div className="relative flex flex-col items-center gap-6">
          <div className="text-9xl animate-[pulse_0.6s_ease-in-out_infinite] drop-shadow-[0_0_40px_rgba(250,204,21,0.9)]">
            🎁
          </div>
          <p className="text-amber-300 font-bold uppercase tracking-[0.3em] animate-pulse">
            Abrindo...
          </p>
          {/* Partículas subindo. */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 12 }, (_, i) => `particle-${i}`).map(
              (id, i) => (
                <span
                  key={id}
                  className="absolute bottom-0 w-2 h-2 rounded-full animate-[ping_1.2s_ease-out_infinite]"
                  style={{
                    left: `${8 + i * 7}%`,
                    backgroundColor: rarityColor,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ),
            )}
          </div>
        </div>
      )}

      {phase === "revealed" && result && (
        <div className="relative flex flex-col items-center gap-5 animate-[fadeIn_0.4s_ease-out]">
          {/* Brilho radial atrás do item. */}
          <div
            className="absolute w-72 h-72 rounded-full blur-3xl opacity-60"
            style={{ backgroundColor: rarityColor }}
          />

          <div
            className="relative text-9xl drop-shadow-2xl animate-[bounce_1s_ease-in-out]"
            style={{ filter: `drop-shadow(0 0 30px ${rarityColor})` }}
          >
            {result.item.emoji}
          </div>

          <div className="relative text-center">
            <p
              className="text-sm font-black uppercase tracking-[0.3em]"
              style={{ color: rarityColor }}
            >
              {RARITY_UI[rarity].label}
            </p>
            <h2 className="text-3xl font-bold text-white mt-1">
              {result.item.name}
            </h2>
            {result.duplicate && (
              <p className="text-slate-400 text-sm mt-2">
                Item repetido — mais sorte na próxima!
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="relative mt-2 px-8 py-3 bg-amber-600 hover:bg-amber-700 rounded-lg font-bold text-lg transition-colors"
          >
            Coletar
          </button>
        </div>
      )}
    </div>
  );
}
