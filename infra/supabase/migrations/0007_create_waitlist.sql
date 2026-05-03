-- 0007_create_waitlist.sql
-- Stores waitlist signups with source tracking and double opt-in confirmation.

create table if not exists waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  confirmed    boolean not null default false,
  source       text not null default 'unknown',  -- 'landing' | 'blog' | 'article:<slug>'
  created_at   timestamptz not null default now()
);

create index if not exists waitlist_email_idx on waitlist(email);
create index if not exists waitlist_confirmed_idx on waitlist(confirmed);

-- RLS: service role only — no public access
alter table waitlist enable row level security;

-- No policies = deny all by default for anon/authenticated.
-- App writes via service role key (bypasses RLS).
