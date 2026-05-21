create table if not exists public.launch_kits (
  id uuid primary key,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  headlines jsonb not null default '[]'::jsonb,
  email_sequence jsonb not null default '[]'::jsonb,
  pricing_recommendation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists launch_kits_idea_id_idx on public.launch_kits (idea_id);

alter table public.launch_kits enable row level security;

create policy "users can read own launch kits"
  on public.launch_kits for select
  using (auth.uid() = user_id);

create policy "users can insert own launch kits"
  on public.launch_kits for insert
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.launch_kits to service_role;
grant select on public.launch_kits to authenticated;
