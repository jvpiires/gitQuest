"use client";

import TeamCard from "./TeamCard";

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

interface GuildMember {
  guild_id: string;
  user_id: string;
}

interface Props {
  open: boolean;
  onClose: () => void;

  guilds: Guild[];
  profiles: Profile[];
  guildMembers: GuildMember[];

  onAddPlayer: (playerId: string, guildId: string) => void;
  onRemovePlayer: (playerId: string, guildId: string) => void;

  onEditGuild: (guild: Guild) => void;
}

const DEPARTMENTS = [
  "SEAP",
  "PHP",
  "JAVA",
  "GLOBAL",
];

export default function OrganogramModal({
  open,
  onClose,
  guilds,
  profiles,
  guildMembers,
  onAddPlayer,
  onRemovePlayer,
  onEditGuild,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-8">

      <div className="relative w-full h-full bg-slate-100 rounded-3xl overflow-auto">

        <button
          onClick={onClose}
          className="absolute right-6 top-6 bg-white rounded-full w-10 h-10 shadow"
        >
          ✕
        </button>

        <div className="min-w-[1400px] p-12">

          {/* PRESIDENTE */}

          <div className="flex justify-center">

            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-12 py-5 rounded-2xl shadow-xl font-black text-2xl">
              🏛 SSCPG
            </div>

          </div>

          <div className="flex justify-center">
            <div className="w-1 h-12 bg-slate-400"></div>
          </div>

          <div className="h-[2px] bg-slate-400 mx-32 mb-12"></div>

          {/* DEPARTAMENTOS */}

          <div className="grid grid-cols-4 gap-10">

            {DEPARTMENTS.map((department) => {

              const departmentGuilds = guilds.filter(
                (guild) => guild.department === department
              );

              return (
                <div
                  key={department}
                  className="flex flex-col items-center"
                >

                  <div className="bg-slate-800 text-white rounded-xl px-6 py-3 font-bold shadow">
                    {department}
                  </div>

                  <div className="w-1 h-8 bg-slate-400"></div>

                  <div className="space-y-8">

                    {departmentGuilds.map((guild) => {
                      const memberIds = new Set(
                        guildMembers
                          .filter((member) => member.guild_id === guild.id)
                          .map((member) => member.user_id)
                      );

                      return (
                        <TeamCard
                          key={guild.id}
                          team={guild}
                          members={profiles.filter((profile) => memberIds.has(profile.id))}
                          availablePlayers={profiles.filter((profile) => !memberIds.has(profile.id))}
                          onAddPlayer={onAddPlayer}
                          onRemovePlayer={onRemovePlayer}
                          onEditGuild={onEditGuild}
                        />
                      );
                    })}

                  </div>

                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
}
