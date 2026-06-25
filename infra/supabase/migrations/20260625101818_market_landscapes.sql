create table public.market_landscapes (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null unique references public.ideas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  segments jsonb not null,
  trends jsonb not null,
  uncovered_opportunities jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.market_landscapes enable row level security;

create policy "users_select_own_market_landscapes"
  on public.market_landscapes for select
  using (auth.uid() = user_id);

create policy "service_role_all_market_landscapes"
  on public.market_landscapes for all
  to service_role
  using (true) with check (true);

grant select, insert, update, delete on public.market_landscapes to service_role;
grant select on public.market_landscapes to authenticated;
