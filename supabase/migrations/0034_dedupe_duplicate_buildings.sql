-- ============================================================
-- 0034: Deduplicate buildings sharing the same name + city.
--
-- 0031_dedupe_shore_north_building.sql never applied: it updates a
-- "building_managers" table that does not exist, so the whole DO block
-- errors out and "The Shore North — Jersey City" still appears twice in
-- the resident building selector. It also missed several tables with a
-- building_id FK (partnerships, bookings, floors, ...), which would have
-- made the final delete fail on an FK violation anyway.
--
-- This version discovers every referencing column from the catalog, so it
-- cannot miss a table or name one that doesn't exist. Idempotent.
-- ============================================================

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
          -- The kept building already has an equivalent row (e.g. a
          -- partnership with the same operator) — the duplicate's row is
          -- redundant, drop it instead.
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
-- active/pilot one for the same building + operator; drop the stale rows so
-- operators don't see phantom pending requests.
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
