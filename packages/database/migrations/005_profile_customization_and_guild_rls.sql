-- Execute no SQL Editor do Supabase. Permite que cada usuário gerencie apenas
-- seus próprios vínculos de guilda e guarda o visual usado no mundo.
alter table public.profiles add column if not exists avatar_style text not null default 'classic';

alter table public.guild_members enable row level security;

drop policy if exists "Users can read guild memberships" on public.guild_members;
drop policy if exists "Users can join guilds" on public.guild_members;
drop policy if exists "Users can leave their guilds" on public.guild_members;

create policy "Users can read guild memberships"
on public.guild_members for select to authenticated using (true);

create policy "Users can join guilds"
on public.guild_members for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can leave their guilds"
on public.guild_members for delete to authenticated
using (auth.uid() = user_id);

-- Caso profiles também esteja com RLS ligado, libera somente a edição do dono.
alter table public.profiles enable row level security;
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (auth.uid() = id) with check (auth.uid() = id);
