-- ============================================================================
-- GitQuest — Schema de Itens e Luckbox
-- Rode este script no Supabase (SQL Editor). É idempotente o suficiente para
-- rodar novamente sem quebrar (usa IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================================

-- 1. Novas colunas em public.users -------------------------------------------
-- available_boxes: quantas luckboxes o jogador ainda pode abrir (1 a cada 10 níveis)
-- boxes_opened:    quantas já foram abertas (para calcular o saldo)
alter table public.users
  add column if not exists available_boxes integer not null default 0,
  add column if not exists boxes_opened integer not null default 0;

-- 2. Catálogo de itens --------------------------------------------------------
-- Os itens em si são estáticos (definidos no código), mas guardamos aqui o que
-- cada jogador possui e o que está equipado.
create table if not exists public.user_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  item_id     text not null,            -- casa com o id do catálogo em items.ts
  slot        text not null,            -- 'HEAD' | 'MAINHAND' | 'OFFHAND' | 'BACK' | 'AURA'
  equipped    boolean not null default false,
  acquired_at timestamptz not null default now(),
  unique (user_id, item_id)             -- não duplica o mesmo item por jogador
);

create index if not exists user_items_user_id_idx on public.user_items (user_id);

-- 3. RLS ----------------------------------------------------------------------
alter table public.user_items enable row level security;

-- Leitura pública: o mundo precisa ver os itens equipados de todos.
drop policy if exists "Itens visíveis para todos" on public.user_items;
create policy "Itens visíveis para todos"
  on public.user_items
  for select
  to anon, authenticated
  using (true);

-- Escrita: cada jogador só mexe nos próprios itens (equipar/desequipar).
drop policy if exists "Dono equipa seus itens" on public.user_items;
create policy "Dono equipa seus itens"
  on public.user_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Insert de itens é feito pelo servidor (service role) ao abrir a luckbox,
-- mas permitimos que o próprio dono também insira, caso queira no futuro.
drop policy if exists "Dono recebe seus itens" on public.user_items;
create policy "Dono recebe seus itens"
  on public.user_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);
