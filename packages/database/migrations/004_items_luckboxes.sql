-- Execute após a criação das tabelas profiles/guilds/guild_members.
create table if not exists public.item_catalog (
  id text primary key, name text not null, hero_class text not null check (hero_class in ('ASSASSIN','MAGE','CLERIC','ARCHER')),
  slot text not null check (slot in ('head','body','weapon','accessory')),
  rarity text not null check (rarity in ('COMMON','RARE','EPIC','LEGENDARY')), icon_url text
);
create table if not exists public.player_inventory (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.item_catalog(id), equipped_slot text check (equipped_slot in ('head','body','weapon','accessory')),
  acquired_at timestamptz not null default now()
);
create table if not exists public.luckboxes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  source_level integer not null, opened_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists player_inventory_user_id_idx on public.player_inventory(user_id);
create index if not exists luckboxes_user_id_idx on public.luckboxes(user_id);
