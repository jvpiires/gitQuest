"use client";

import { useState } from "react";

export function VersionNoticeModal() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-950/95 shadow-2xl">
        <div className="border-b border-amber-500/20 px-6 py-4">
          <h2 className="text-xl font-extrabold tracking-wide text-amber-300">
            ALFA 0.0.1
          </h2>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-slate-200 leading-relaxed">
            Standby. Aguarde atualizacao sempre que entrar.
          </p>
        </div>

        <div className="flex justify-end border-t border-slate-800 px-6 py-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
