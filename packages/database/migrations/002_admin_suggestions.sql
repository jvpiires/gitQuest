-- ============================================================================
-- GitQuest — Sugestoes para o Admin
-- Permite que usuarios autenticados enviem melhorias para o admin do jogo.
-- ============================================================================

create table if not exists public.admin_suggestions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  author_username text not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint admin_suggestions_message_len_chk
    check (char_length(btrim(message)) between 10 and 600)
);

create index if not exists admin_suggestions_created_at_idx
  on public.admin_suggestions (created_at desc);

alter table public.admin_suggestions enable row level security;

-- Qualquer usuario logado pode enviar sugestao em seu proprio nome.
drop policy if exists "Autor cria sugestao" on public.admin_suggestions;
create policy "Autor cria sugestao"
  on public.admin_suggestions
  for insert
  to authenticated
  with check (auth.uid() = author_id);

-- Leitura: autor pode ver o que escreveu e admin (joao.santos) pode ver todas.
drop policy if exists "Autor ou admin le sugestoes" on public.admin_suggestions;
create policy "Autor ou admin le sugestoes"
  on public.admin_suggestions
  for select
  to authenticated
  using (
    auth.uid() = author_id
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and lower(u.gitlab_username) = 'joao.santos'
    )
  );
