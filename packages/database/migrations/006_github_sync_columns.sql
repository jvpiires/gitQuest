-- Campos de sincronização GitHub para cálculo de XP retroativo e incremental.
alter table public.profiles add column if not exists github_xp_total integer not null default 0;
alter table public.profiles add column if not exists github_xp_snapshot jsonb;
alter table public.profiles add column if not exists last_github_sync_at timestamptz;
