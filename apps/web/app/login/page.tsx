"use client";

import { useEffect, useState } from "react";
import { supabase } from "@gitquest/database";

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? "supabase";
const CORPORATE_EMAIL_DOMAINS = (
  process.env.NEXT_PUBLIC_CORPORATE_EMAIL_DOMAINS ?? "seplag.mt.gov.br"
)
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

function normalizeCorporateEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isCorporateEmail(email: string): boolean {
  const normalized = normalizeCorporateEmail(email);
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0) return false;
  const domain = normalized.slice(atIndex + 1);
  return CORPORATE_EMAIL_DOMAINS.includes(domain);
}

export default function LoginPage() {
  const [mode, setMode] = useState<"magic" | "gitlab" | "username">(
    AUTH_MODE === "internal_gitlab" ? "username" : "magic",
  );
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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



  const handleCorporateLogin = async () => {
    const normalizedEmail = normalizeCorporateEmail(email);
    if (!isCorporateEmail(normalizedEmail)) {
      const allowedDomains = CORPORATE_EMAIL_DOMAINS.map((domain) => `@${domain}`).join(" ou ");
      setStatus("error");
      setErrorMsg(`Use seu email corporativo (${allowedDomains}).`);
      return;
    }

    setStatus("sending");
    setErrorMsg("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fdashboard`,
        },
      });

      if (error) {
        console.error("Erro ao enviar magic link:", error);
        setStatus("error");
        setErrorMsg(error.message || "Não foi possível enviar o link de acesso.");
        return;
      }

      setStatus("sent");
    } catch (err) {
      console.error("Exceção ao iniciar login corporativo:", err);
      setStatus("error");
      setErrorMsg("Falha ao enviar link de acesso. Tente novamente.");
    }
  };

  const handleGitlabLogin = async () => {
    setStatus("sending");
    setErrorMsg("");

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

  const handleUsernameLogin = async () => {
    const normalizedUsername = username.trim().replace(/^@+/, "").toLowerCase();
    if (!normalizedUsername) {
      setStatus("error");
      setErrorMsg("Informe seu username do GitLab interno.");
      return;
    }

    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/gitlab/username-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalizedUsername, next: "/dashboard" }),
      });

      const data = (await res.json()) as {
        error?: string;
        nextPath?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível autenticar com esse username.");
      }

      window.location.href = data.nextPath || "/dashboard";
    } catch (err) {
      console.error("Exceção ao iniciar login por username:", err);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Falha no login por username.");
    }
  };

  let authContent: React.ReactNode;
  if (mode === "username") {
    authContent = (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-300 text-center">
          Entre apenas com seu username do GitLab interno. A conta local será vinculada
          automaticamente.
        </p>
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="ex: joao.santos"
          autoComplete="username"
          className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
        />
        <button
          type="button"
          onClick={handleUsernameLogin}
          disabled={status === "sending"}
          className="w-full px-8 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-colors"
        >
          {status === "sending" ? "Validando usuário..." : "Entrar com username"}
        </button>
        {status === "error" && (
          <p className="text-red-400 text-sm text-center">{errorMsg}</p>
        )}
      </div>
    );
  } else if (mode === "magic") {
    authContent = (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-300 text-center">
          Entre com seu email corporativo e confirme o link enviado para o inbox.
        </p>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nome@seplag.mt.gov.br"
          autoComplete="email"
          className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
        />
        <button
          type="button"
          onClick={handleCorporateLogin}
          disabled={status === "sending"}
          className="w-full px-8 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-colors"
        >
          {status === "sending" ? "Enviando link..." : "Entrar com email corporativo"}
        </button>
        {status === "sent" && (
          <p className="text-emerald-300 text-sm text-center">
            Link enviado. Abra seu email corporativo para concluir o login.
          </p>
        )}
        {status === "error" && (
          <p className="text-red-400 text-sm text-center">{errorMsg}</p>
        )}
      </div>
    );
  } else if (mode === "gitlab") {
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
            {AUTH_MODE === "internal_gitlab"
              ? "Entre na Taverna com seu username GitLab."
              : "Entre na Taverna com seu email corporativo."}
          </p>

          <div className="mt-4 inline-flex rounded-lg border border-slate-700 overflow-hidden">
            {AUTH_MODE === "internal_gitlab" && (
              <button
                type="button"
                onClick={() => {
                  setMode("username");
                  setStatus("idle");
                  setErrorMsg("");
                }}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  mode === "username"
                    ? "bg-orange-600 text-white"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Username GitLab
              </button>
            )}

            {AUTH_MODE !== "internal_gitlab" && (
              <button
                type="button"
                onClick={() => {
                  setMode("magic");
                  setStatus("idle");
                  setErrorMsg("");
                }}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  mode === "magic"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Email corporativo
              </button>
            )}

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
              {AUTH_MODE === "internal_gitlab" ? "GitLab interno" : "GitLab SSO"}
            </button>
          </div>
        </div>

        {authContent}
      </div>
    </main>
  );
}
