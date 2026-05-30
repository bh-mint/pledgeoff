-- #25 Enterprise domain allowlist
-- Workspace owners register email domains; users with matching domains auto-join.

create table if not exists public.team_domain_allowlists (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  domain      text not null,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint team_domain_allowlists_domain_check check (domain ~ '^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$'),
  unique (team_id, domain)
);

create index if not exists team_domain_allowlists_domain_idx on public.team_domain_allowlists (domain);

alter table public.team_domain_allowlists enable row level security;

create policy "team members can read domain allowlists"
  on public.team_domain_allowlists for select
  using (
    exists (
      select 1 from public.team_memberships tm
      where tm.team_id = team_domain_allowlists.team_id
        and tm.user_id = auth.uid()
        and tm.status = 'active'
    )
    or exists (
      select 1 from public.teams t
      where t.id = team_domain_allowlists.team_id
        and t.owner_id = auth.uid()
    )
  );

create policy "team owner and admin can write domain allowlists"
  on public.team_domain_allowlists for all
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_domain_allowlists.team_id
        and t.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.team_memberships tm
      where tm.team_id = team_domain_allowlists.team_id
        and tm.user_id = auth.uid()
        and tm.role = 'admin'
        and tm.status = 'active'
    )
  );

grant select, insert, delete on public.team_domain_allowlists to service_role;
grant select on public.team_domain_allowlists to authenticated;
