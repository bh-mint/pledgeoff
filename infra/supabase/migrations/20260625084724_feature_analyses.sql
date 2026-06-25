create table if not exists public.feature_analyses (
  id           uuid primary key default gen_random_uuid(),
  idea_id      uuid not null references public.ideas(id) on delete cascade,
  user_id      uuid not null,
  features     jsonb not null default '[]',
  competitor_names jsonb not null default '[]',
  created_at   timestamptz not null default now()
);

create index if not exists feature_analyses_idea_id_idx on public.feature_analyses (idea_id);
create index if not exists feature_analyses_user_id_idx on public.feature_analyses (user_id);

alter table public.feature_analyses enable row level security;

create policy "Users can manage their own feature analyses"
  on public.feature_analyses
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.feature_analyses to service_role;
grant select on public.feature_analyses to authenticated;
