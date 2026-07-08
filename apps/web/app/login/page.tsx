"use client";

import { useEffect, useState } from "react";
import { supabase } from "@gitquest/database";

// Domínio corporativo permitido. Ajuste para o domínio da sua empresa.
//const CORPORATE_DOMAIN = "@seplag.mt.gov.br";
const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? "supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"magic" | "password" | "gitlab">("gitlab");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const queryError = url.searchParams.get("authError");
    const queryDescription = url.searchParams.get("authErrorDescription");

    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const hashError = hashParams.get("error");
    const hashDescription = hashParams.get("error_description");

    const error = queryError || hashError;
    const description = queryDescription || hashDescription;

    if (error) {
      setStatus("error");
      setErrorMsg(
        decodeURIComponent(
          description ||
            `Falha no SSO (${error}). Verifique a configuração do provider GitLab no Supabase.`,
        ),
      );
    }
  }, []);



  const handleGitlabLogin = async () => {
    setStatus("sending");
    setErrorMsg("");

    if (AUTH_MODE === "internal_gitlab") {
      window.location.href = "/api/auth/gitlab/start?next=%2F";
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "gitlab",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Erro ao entrar com GitLab SSO:", error);
        setStatus("error");
        setErrorMsg(
          "GitLab SSO indisponível agora. Verifique se o provider GitLab está configurado no Supabase.",
        );
      }
    } catch (err) {
      console.error("Exceção ao iniciar GitLab SSO:", err);
      setStatus("error");
      setErrorMsg("Falha ao iniciar login GitLab. Tente novamente.");
    }
  };

  let authContent: React.ReactNode;
  if (mode === "gitlab") {
    authContent = (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-300 text-center">
          Entre direto com sua conta do GitLab, sem esperar email.
        </p>
        <button
          type="button"
          onClick={handleGitlabLogin}
          disabled={status === "sending"}
          className="w-full px-8 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-colors"
        >
          {status === "sending" ? "Redirecionando..." : "Entrar com GitLab"}
        </button>
        {status === "error" && (
          <p className="text-red-400 text-sm text-center">{errorMsg}</p>
        )}
      </div>
    );
  }

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

          <div className="mt-4 inline-flex rounded-lg border border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setMode("gitlab");
                setStatus("idle");
                setErrorMsg("");
              }}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                mode === "gitlab"
                  ? "bg-orange-600 text-white"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              GitLab SSO
            </button>
          </div>
        </div>

        {authContent}
      </div>
    </main>
  );
}
