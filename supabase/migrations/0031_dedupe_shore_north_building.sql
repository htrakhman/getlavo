-- Deduplicate "The Shore North" building that was created twice.
-- Strategy: keep the building with the most associated data (residents/bookings),
-- re-point all foreign keys to the canonical record, then delete the duplicate.
-- Safe to run multiple times (no-op if already deduped).

do $$
declare
  keep_id    uuid;
  drop_id    uuid;
begin
  -- Find the two duplicate buildings by name + city
  select
    (select id from buildings where name = 'The Shore North' and city = 'Jersey City' order by created_at asc  limit 1),
    (select id from buildings where name = 'The Shore North' and city = 'Jersey City' order by created_at desc limit 1)
  into keep_id, drop_id;

  -- Nothing to do if there's only one (or zero) record
  if keep_id is null or drop_id is null or keep_id = drop_id then
    return;
  end if;

  -- Re-point related rows to the canonical building
  update residents          set building_id = keep_id where building_id = drop_id;
  update building_invites   set building_id = keep_id where building_id = drop_id;
  update announcements      set building_id = keep_id where building_id = drop_id;
  update issues             set building_id = keep_id where building_id = drop_id;
  update wash_days          set building_id = keep_id where building_id = drop_id;
  update contracts          set building_id = keep_id where building_id = drop_id;
  update building_managers  set building_id = keep_id where building_id = drop_id;

  -- Delete the duplicate
  delete from buildings where id = drop_id;

  raise notice 'Deduped The Shore North: kept %, dropped %', keep_id, drop_id;
end;
$$;
