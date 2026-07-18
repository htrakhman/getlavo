-- ============================================================
-- QA Round 2 catch-up (July 18, 2026) — idempotent, safe to re-run.
--
-- Production is behind on manually-applied migrations. Two Round-2 QA
-- bugs trace directly to that drift:
--
--   1. Operator "Wash days" page redirecting to Overview: the page
--      selected operators.wash_days_hub (0026); if the column is missing
--      the whole select errors and the page treats the operator as
--      nonexistent. (The page is now also resilient in code.)
--   2. "The Shore North — Jersey City" duplicated in the resident
--      onboarding dropdown: the 0034 dedupe never ran in prod.
--
-- Paste this whole file into Supabase Dashboard → SQL Editor → Run.
-- ============================================================

-- ── 0026: operator wash days hub column ─────────────────────
alter table operators
  add column if not exists wash_days_hub jsonb not null default '{}'::jsonb;

-- ── 0033: re-apply role grants to ALL tables ────────────────
-- Tables created after 0002 can lack grants for authenticated, making
-- RLS-scoped reads fail with permission denied (pages render empty).
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant select on all tables in schema public to anon;

grant all on all sequences in schema public to authenticated;
grant all on all sequences in schema public to service_role;

alter default privileges in schema public
  grant all on tables to authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to authenticated, service_role;

-- ── 0034: deduplicate buildings sharing the same name + city ─
do $$
declare
  grp     record;
  keep_id uuid;
  dup     record;
  ref     record;
begin
  for grp in
    select lower(trim(name)) as n, lower(trim(coalesce(city, ''))) as c
    from buildings
    group by 1, 2
    having count(*) > 1
  loop
    -- Keep the oldest record (first created = most likely the one with data)
    select id into keep_id
    from buildings
    where lower(trim(name)) = grp.n and lower(trim(coalesce(city, ''))) = grp.c
    order by created_at asc
    limit 1;

    for dup in
      select id from buildings
      where lower(trim(name)) = grp.n
        and lower(trim(coalesce(city, ''))) = grp.c
        and id <> keep_id
    loop
      -- Re-point every column in the schema that references buildings(id)
      for ref in
        select c.conrelid::regclass as tbl, a.attname as col
        from pg_constraint c
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
        where c.contype = 'f'
          and c.confrelid = 'public.buildings'::regclass
      loop
        begin
          execute format('update %s set %I = $1 where %I = $2', ref.tbl, ref.col, ref.col)
            using keep_id, dup.id;
        exception when unique_violation then
          execute format('delete from %s where %I = $1', ref.tbl, ref.col)
            using dup.id;
        end;
      end loop;

      delete from buildings where id = dup.id;
      raise notice 'Deduped building %/%: kept %, dropped %', grp.n, grp.c, keep_id, dup.id;
    end loop;
  end loop;
end;
$$;

-- Merging buildings can leave a stale pending partnership alongside an
-- active/pilot one for the same building + operator; drop the stale rows.
delete from partnerships p
where p.status = 'pending'
  and exists (
    select 1 from partnerships a
    where a.building_id = p.building_id
      and a.operator_id = p.operator_id
      and a.id <> p.id
      and a.status <> 'pending'
  );

-- Prevent the same duplicate from being created again.
create unique index if not exists buildings_name_city_unique
  on buildings (lower(trim(name)), lower(trim(coalesce(city, ''))));
