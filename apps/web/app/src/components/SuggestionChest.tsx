"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@gitquest/database";

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? "supabase";

const ADMIN_USERNAME = "joao.santos";
const MIN_CHARS = 10;
const MAX_CHARS = 600;

type Phase = "idle" | "open" | "sending" | "sent";

// Caixa de sugestao no canto inferior esquerdo, no mesmo estilo da luckbox.
// Jogadores logados podem enviar melhorias para o admin sem sair do mapa.
export function SuggestionChest() {
  const [userId, setUserId] = useState<string | null>(null);
  const [gitlabUsername, setGitlabUsername] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (AUTH_MODE === "internal_gitlab") {
        const meRes = await fetch("/api/player/me");
        if (!meRes.ok) return;

        const me = (await meRes.json()) as {
          authenticated?: boolean;
          hasCharacter?: boolean;
          user?: { id?: string; gitlab_username?: string | null };
        };

        if (!me.authenticated || !me.user?.id || !me.hasCharacter) return;

        setUserId(me.user.id);
        if (me.user.gitlab_username) {
          setGitlabUsername(me.user.gitlab_username);
        }

        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;
      const uid = session.user.id;

      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id, gitlab_username")
        .eq("id", uid)
        .maybeSingle();

      if (userError || !userRow) return;

      setUserId(userRow.id as string);
      setGitlabUsername((userRow.gitlab_username as string | null) ?? null);
    }

    load();
  }, []);

  const isAdmin = useMemo(
    () => gitlabUsername?.toLowerCase() === ADMIN_USERNAME,
    [gitlabUsername],
  );

  const canSend =
    message.trim().length >= MIN_CHARS &&
    message.trim().length <= MAX_CHARS &&
    phase !== "sending";

  const open = () => {
    setError(null);
    setPhase("open");
  };

  const close = () => {
    setPhase("idle");
    setError(null);
    setMessage("");
  };

  const sendSuggestion = async () => {
    if (!userId) return;

    const clean = message.trim();
    if (clean.length < MIN_CHARS) {
      setError(`Escreva pelo menos ${MIN_CHARS} caracteres.`);
      return;
    }
    if (clean.length > MAX_CHARS) {
      setError(`Use no maximo ${MAX_CHARS} caracteres.`);
      return;
    }

    setError(null);
    setPhase("sending");

    if (AUTH_MODE === "internal_gitlab") {
      try {
        const res = await fetch("/api/admin-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: clean }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Nao foi possivel enviar agora.");
        }

        setPhase("sent");
      } catch (err) {
        console.error("Erro ao enviar sugestao:", err);
        setError(err instanceof Error ? err.message : "Nao foi possivel enviar agora.");
        setPhase("open");
      }

      return;
    }

    try {
      const { error: insertError } = await supabase
        .from("admin_suggestions")
        .insert({
          author_id: userId,
          author_username: gitlabUsername,
          message: clean,
        });

      if (insertError) {
        throw insertError;
      }

      setPhase("sent");
    } catch (err) {
      console.error("Erro ao enviar sugestao:", err);
      setError("Nao foi possivel enviar agora. Tente novamente.");
      setPhase("open");
    }
  };

  // Admin nao precisa da caixa de envio para si mesmo.
  if (!userId || isAdmin) return null;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="fixed bottom-6 left-28 z-40 group flex flex-col items-center gap-2 focus:outline-none"
      >
        <div className="relative text-6xl transition-transform animate-bounce group-hover:scale-110 drop-shadow-[0_0_18px_rgba(59,130,246,0.75)]">
          📮
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-sky-300 bg-slate-950/70 px-3 py-1 rounded-full border border-sky-700/40">
          Caixa de sugestao
        </span>
      </button>

      {(phase === "open" || phase === "sending" || phase === "sent") && (
        <SuggestionOverlay
          phase={phase}
          message={message}
          setMessage={setMessage}
          error={error}
          onClose={close}
          onSend={sendSuggestion}
          canSend={canSend}
        />
      )}
    </>
  );
}

function SuggestionOverlay({
  phase,
  message,
  setMessage,
  error,
  onClose,
  onSend,
  canSend,
}: Readonly<{
  phase: Phase;
  message: string;
  setMessage: (value: string) => void;
  error: string | null;
  onClose: () => void;
  onSend: () => void;
  canSend: boolean;
}>) {
  const remaining = MAX_CHARS - message.trim().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-950/95 p-5 shadow-2xl">
        {phase !== "sent" ? (
          <>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-black uppercase tracking-widest text-sky-300">
                Caixa de sugestao
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Fechar
              </button>
            </div>

            <p className="text-sm text-slate-300 mb-3">
              Envie uma melhoria para o admin do reino. Sua ideia pode virar a
              proxima feature.
            </p>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex.: adiciona quests diarias com recompensa de XP e ranking semanal..."
              className="w-full min-h-[150px] rounded-lg bg-slate-900 border border-slate-700 p-3 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              disabled={phase === "sending"}
            />

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Minimo {MIN_CHARS} caracteres
              </span>
              <span className={remaining < 0 ? "text-red-300" : "text-slate-400"}>
                {Math.max(remaining, 0)} restantes
              </span>
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-red-700 bg-red-950/70 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold"
                disabled={phase === "sending"}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSend}
                disabled={!canSend}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-700 text-white text-sm font-bold"
              >
                {phase === "sending" ? "Enviando..." : "Enviar sugestao"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-6 gap-4">
            <div className="text-6xl">✅</div>
            <h3 className="text-xl font-black text-emerald-300 uppercase tracking-widest">
              Sugestao enviada
            </h3>
            <p className="text-sm text-slate-300 max-w-md">
              Obrigado por contribuir. O admin vai analisar sua melhoria.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
