alter table public.launch_kits
  add column if not exists action_plan jsonb;
