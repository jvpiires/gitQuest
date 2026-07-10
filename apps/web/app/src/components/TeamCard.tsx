"use client";

interface Guild {
  id: string;
  name: string;
  icon_url?: string;
  department: string;
}

interface Profile {
  id: string;
  github_username: string;
  avatar_url?: string;
}

interface TeamCardProps {
  team: Guild;
  members: Profile[];
  availablePlayers: Profile[];
  onAddPlayer: (playerId: string, guildId: string) => void;
  onRemovePlayer: (playerId: string, guildId: string) => void;
  onEditGuild: (guild: Guild) => void;
}

export default function TeamCard({
  team,
  members,
  availablePlayers,
  onAddPlayer,
  onRemovePlayer,
  onEditGuild,
}: Readonly<TeamCardProps>) {
  return (
    <div className="relative w-72 overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-xl">
      <div className="flex items-center justify-between bg-gradient-to-r from-cyan-700 to-blue-700 p-4 text-white">
        {team.icon_url ? (
          <img src={team.icon_url} className="h-10 w-10 rounded-lg border border-white/30 object-cover" alt="" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">🛡️</div>
        )}

        <div className="min-w-0 flex-1 px-3">
          <h3 className="truncate font-black tracking-wide">{team.name}</h3>
          <p className="text-xs text-cyan-100">{members.length} membro(s)</p>
        </div>

        <button onClick={() => onEditGuild(team)} className="font-bold text-cyan-50 transition-colors hover:text-yellow-300">
          ✎
        </button>
      </div>

      <div className="p-4">
        <select
          defaultValue=""
          onChange={(event) => {
            if (!event.target.value) return;
            onAddPlayer(event.target.value, team.id);
            event.target.value = "";
          }}
          className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-sm text-slate-100"
        >
          <option value="">➕ Adicionar aventureiro</option>
          {availablePlayers.map((player) => (
            <option key={player.id} value={player.id}>
              {player.github_username}
            </option>
          ))}
        </select>

        <div className="space-y-2">
          {members.length === 0 && (
            <div className="py-3 text-center text-xs italic text-slate-400">Nenhum membro.</div>
          )}

          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-2">
              <div className="flex items-center gap-2">
                <img
                  src={member.avatar_url ?? `https://api.dicebear.com/7.x/adventurer/svg?seed=${member.github_username}`}
                  className="h-8 w-8 rounded-full border border-slate-600"
                  alt=""
                />
                <span className="text-sm font-semibold text-slate-100">{member.github_username}</span>
              </div>

              <button
                onClick={() => onRemovePlayer(member.id, team.id)}
                className="font-bold text-red-400 transition-colors hover:text-red-300"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
