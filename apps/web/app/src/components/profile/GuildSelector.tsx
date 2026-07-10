"use client";

interface Guild { id: string; name: string; icon_url?: string | null; department?: string | null; }

interface GuildSelectorProps {
  guilds: Guild[];
  selectedGuildId?: string;
  busyGuildId?: string;
  onToggle: (guildId: string, isMember: boolean) => void;
}

export default function GuildSelector({ guilds, selectedGuildId, busyGuildId, onToggle }: GuildSelectorProps) {
  return <section className="rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-xl"><div className="flex items-baseline justify-between"><h2 className="font-mono text-lg font-black text-white">Minha guilda</h2><span className="text-xs text-slate-400">Escolha somente uma guilda</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{guilds.map((guild) => { const isMember = selectedGuildId === guild.id; return <button key={guild.id} disabled={busyGuildId === guild.id} onClick={() => onToggle(guild.id, isMember)} className={`flex items-center justify-between rounded-xl border p-3 text-left transition disabled:opacity-50 ${isMember ? "border-emerald-400/70 bg-emerald-400/10" : "border-slate-700 bg-slate-800 hover:border-cyan-300"}`}><span className="flex min-w-0 items-center gap-3">{guild.icon_url ? <img src={guild.icon_url} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="text-2xl">🛡️</span>}<span className="min-w-0"><span className="block truncate font-bold text-white">{guild.name}</span><span className="block text-xs text-slate-400">{guild.department || "GLOBAL"}</span></span></span><span className={`text-xs font-bold ${isMember ? "text-emerald-300" : "text-cyan-300"}`}>{isMember ? "Selecionada ✓" : "Escolher"}</span></button>; })}</div>{!guilds.length && <p className="mt-3 text-sm text-slate-400">Ainda não há guildas disponíveis.</p>}</section>;
}
