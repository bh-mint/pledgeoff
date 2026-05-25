-- RPC: average score for ideas in same category (platform-wide)
-- Returns null avg_score if fewer than 3 ideas in category.
-- search_path is set to prevent search-path injection.

create or replace function public.avg_score_by_category(
  category_name text,
  exclude_idea_id uuid
)
returns table(avg_score numeric, count bigint)
language sql
security definer
set search_path = public
as $$
  select
    avg(d.score)::numeric as avg_score,
    count(*)              as count
  from decisions d
  join ideas i on i.id = d.idea_id
  where d.score is not null
    and i.id != exclude_idea_id
    and i.text ilike '%' || chr(10) || 'Category: ' || category_name
$$;

revoke execute on function public.avg_score_by_category(text, uuid) from public;
grant execute on function public.avg_score_by_category(text, uuid) to service_role;