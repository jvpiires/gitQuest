-- Um jogador pode pertencer a várias guildas.
-- Esta migração preserva profiles.guild_id por compatibilidade temporária;
-- o código novo usa guild_members como fonte de verdade.

create table if not exists public.guild_members (
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (guild_id, user_id)
);

create index if not exists guild_members_user_id_idx
  on public.guild_members (user_id);

-- Também cobre instalações em que guild_members já existia sem chave composta.
create unique index if not exists guild_members_user_id_guild_id_key
  on public.guild_members (user_id, guild_id);

-- Migra os vínculos antigos sem duplicá-los caso a migração seja executada novamente.
insert into public.guild_members (guild_id, user_id)
select guild_id, id
from public.profiles
where guild_id is not null
on conflict (guild_id, user_id) do nothing;
