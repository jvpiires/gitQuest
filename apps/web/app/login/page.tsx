"use client";

import { useState } from "react";
import { supabase } from "@gitquest/database";

// Domínio corporativo permitido. Ajuste para o domínio da sua empresa.
const CORPORATE_DOMAIN = "@seplag.mt.gov.br";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Valida se é um email corporativo antes de enviar o link
    if (!normalizedEmail.endsWith(CORPORATE_DOMAIN)) {
      setStatus("error");
      setErrorMsg(`Use seu email corporativo (${CORPORATE_DOMAIN}).`);
      return;
    }

    setStatus("sending");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        // Após clicar no link do email, o Supabase volta para o callback
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("Erro ao enviar magic link:", error);
      setStatus("error");
      setErrorMsg("Não foi possível enviar o link. Tente novamente.");
      return;
    }

    setStatus("sent");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
      <div className="w-full max-w-md bg-slate-950/70 backdrop-blur-md p-8 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <span>🏰</span> GitQuest
          </h1>
          <p className="text-slate-400 text-sm">
            Entre na Taverna com seu email corporativo.
          </p>
        </div>

        {status === "sent" ? (
          <div className="text-center bg-emerald-950/40 border border-emerald-800 rounded-lg p-6">
            <p className="text-emerald-300 font-semibold mb-1">
              📨 Link enviado!
            </p>
            <p className="text-slate-400 text-sm">
              Verifique sua caixa de entrada em{" "}
              <span className="text-slate-200 font-mono">{email}</span> e clique
              no link para entrar.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(email);
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">
                Email corporativo
              </label>
              <input
                id="email"
                type="email"
                placeholder={`joao.silva${CORPORATE_DOMAIN}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-orange-500 text-white transition-colors"
              />
            </div>

            {status === "error" && (
              <p className="text-red-400 text-sm">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending" || !email}
              className="mt-2 px-8 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-colors"
            >
              {status === "sending" ? "Enviando..." : "Entrar com link mágico"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
