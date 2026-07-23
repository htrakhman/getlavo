-- Fix infinite recursion between partnerships and residents RLS policies.
--
-- The `partnerships_resident_read` policy queried `residents`, while the
-- `residents_operator_read` policy queried `partnerships`. Each table's RLS
-- therefore triggered the other's, producing
--   ERROR 42P17: infinite recursion detected in policy for relation "partnerships".
--
-- Any query that evaluates the partnerships policies hits this, including the
-- operator's own /operator/wash-days page: `wash_days_visible` joins through
-- `partnerships`, the subquery errors, the page swallows the null result, and
-- confirmed wash days silently render as "No wash days yet." — even though the
-- underlying wash_days rows are correct.
--
-- Fix: move both cross-table lookups into SECURITY DEFINER helpers (the same
-- pattern already used by is_building_manager), so the inner reads bypass RLS
-- and the cycle is broken.

create or replace function public.is_building_resident(bid uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path to 'public'
as $$
  select exists (
    select 1 from residents r
    where r.building_id = bid and r.profile_id = auth.uid()
  )
$$;

create or replace function public.operator_has_active_partnership(bid uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path to 'public'
as $$
  select exists (
    select 1 from partnerships p
    join operators o on o.id = p.operator_id
    where p.building_id = bid
      and p.status = 'active'
      and o.owner_id = auth.uid()
  )
$$;

-- Rebuild the two policies that referenced each other's tables directly.
drop policy if exists partnerships_resident_read on partnerships;
create policy partnerships_resident_read on partnerships
  for select using (public.is_building_resident(building_id));

drop policy if exists residents_operator_read on residents;
create policy residents_operator_read on residents
  for select using (public.operator_has_active_partnership(building_id));
