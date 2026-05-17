-- 0026_split_profile_name_fields.sql
-- Splits full_name into first_name + last_name, adds username.

alter table profiles
  add column if not exists first_name text,
  add column if not exists last_name  text,
  add column if not exists username   text;

-- Backfill: first word → first_name, rest → last_name
update profiles
set
  first_name = split_part(trim(full_name), ' ', 1),
  last_name  = case
    when trim(full_name) like '% %'
    then trim(substring(trim(full_name) from position(' ' in trim(full_name)) + 1))
    else null
  end
where full_name is not null and full_name <> '';

-- Unique sparse index on username
create unique index if not exists profiles_username_unique
  on profiles (username)
  where username is not null;

-- Update trigger to populate first_name/last_name from Google OAuth metadata
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_full_name text;
  v_first     text;
  v_last      text;
begin
  v_full_name := trim(new.raw_user_meta_data->>'full_name');
  v_first     := split_part(v_full_name, ' ', 1);
  v_last      := case
    when v_full_name like '% %'
    then trim(substring(v_full_name from position(' ' in v_full_name) + 1))
    else null
  end;

  insert into public.profiles (id, email, first_name, last_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(v_first, ''),
    nullif(v_last,  ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Recreate v_decisions_full without full_name (computed as first_name || ' ' || last_name)
create or replace view v_decisions_full as
select
  p.id                                                           as user_id,
  trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as full_name,
  p.email,
  i.id                                                           as idea_id,
  i.text                                                         as idea_text,
  i.created_at,
  d.id                                                           as decision_id,
  d.verdict,
  d.confidence,
  d.score                                                        as score_total,
  (select (elem->>'score')::int from jsonb_array_elements(d.dimensions) elem where elem->>'name' = 'Market Demand') as score_market_demand,
  (select (elem->>'score')::int from jsonb_array_elements(d.dimensions) elem where elem->>'name' = 'Competition')   as score_competition,
  (select (elem->>'score')::int from jsonb_array_elements(d.dimensions) elem where elem->>'name' = 'Feasibility')   as score_feasibility,
  (select (elem->>'score')::int from jsonb_array_elements(d.dimensions) elem where elem->>'name' = 'Timing')        as score_timing,
  d.reasoning
from profiles p
join ideas    i on i.user_id = p.id
join decisions d on d.idea_id = i.id;

-- Drop full_name — now computed in app and view above
alter table profiles drop column if exists full_name;
