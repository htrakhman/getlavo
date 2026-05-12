-- Backfill profile_portals for any user who has a role in profiles but no portal entry.
-- This catches users who signed up after 0006 via pick-role or the old callback,
-- which wrote profiles.role but never inserted into profile_portals.
insert into profile_portals (profile_id, portal)
select id,
  case role
    when 'building_manager' then 'building'::portal_kind
    when 'operator'         then 'operator'::portal_kind
    when 'resident'         then 'resident'::portal_kind
  end
from profiles
where role in ('building_manager', 'operator', 'resident')
  and id not in (select profile_id from profile_portals)
on conflict do nothing;
