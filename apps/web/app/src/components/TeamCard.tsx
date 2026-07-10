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
}: TeamCardProps) {
  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-md w-72 overflow-hidden">

      <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white p-4 flex items-center justify-between">
        {team.icon_url ? (
          <img
            src={team.icon_url}
            className="w-10 h-10 rounded-lg object-cover bg-white"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            🛡️
          </div>
        )}

        <div>
          <h3 className="font-black">{team.name}</h3>
          <p className="text-xs opacity-90">
            {members.length} membro(s)
          </p>
        </div>
        <button
          onClick={() => onEditGuild(team)}
          className="text-white hover:text-yellow-300 font-bold"
        >
          ✎
        </button>
      </div>

      <div className="p-4">

        <select
          defaultValue=""
          onChange={(e) => {
            if (!e.target.value) return;

            onAddPlayer(e.target.value, team.id);

            e.target.value = "";
          }}
          className="w-full border rounded-lg p-2 text-sm bg-slate-50 mb-4"
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
            <div className="text-xs text-slate-400 italic text-center py-3">
              Nenhum membro.
            </div>
          )}

          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between bg-slate-50 rounded-xl p-2"
            >
              <div className="flex items-center gap-2">

                <img
                  src={
                    member.avatar_url ??
                    `https://api.dicebear.com/7.x/adventurer/svg?seed=${member.github_username}`
                  }
                  className="w-8 h-8 rounded-full"
                />

                <span className="text-sm font-semibold">
                  {member.github_username}
                </span>
              </div>

              <button
                onClick={() => onRemovePlayer(member.id, team.id)}
                className="text-red-500 hover:text-red-700 font-bold"
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
