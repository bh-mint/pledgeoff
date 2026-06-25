create table if not exists public.battlecards (
  id           uuid primary key default gen_random_uuid(),
  idea_id      uuid not null references public.ideas(id) on delete cascade,
  user_id      uuid not null,
  entries      jsonb not null default '[]',
  created_at   timestamptz not null default now()
);

create index if not exists battlecards_idea_id_idx on public.battlecards (idea_id);
create index if not exists battlecards_user_id_idx on public.battlecards (user_id);

alter table public.battlecards enable row level security;

create policy "Users can manage their own battlecards"
  on public.battlecards
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.battlecards to service_role;
grant select on public.battlecards to authenticated;
