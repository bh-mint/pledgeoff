create table if not exists public.api_request_log (
  id           uuid primary key default gen_random_uuid(),
  api_key_id   uuid not null references public.api_keys(id) on delete cascade,
  user_id      uuid not null,
  endpoint     text not null,
  method       text not null check (method in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  status_code  int  not null,
  latency_ms   int  not null,
  ip_hash      text not null,
  trace_id     text not null,
  created_at   timestamptz not null default now()
);

create index if not exists api_request_log_user_created_idx
  on public.api_request_log (user_id, created_at desc);

create index if not exists api_request_log_key_created_idx
  on public.api_request_log (api_key_id, created_at desc);

create index if not exists api_request_log_created_idx
  on public.api_request_log (created_at desc);

alter table public.api_request_log enable row level security;

create policy "Users can view their own API request logs"
  on public.api_request_log
  for select
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.api_request_log to service_role;
grant select on public.api_request_log to authenticated;
