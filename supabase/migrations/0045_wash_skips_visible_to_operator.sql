-- Let the operator (and the building manager) read resident skips.
--
-- wash_skips shipped with a single policy, wash_skips_resident, whose USING
-- clause matches only rows belonging to the calling resident. The operator is a
-- different auth.uid(), so every RLS-scoped read of this table from the
-- operator portal came back empty — not an error, just zero rows.
--
-- The crew tool and the prep sheet both already query wash_skips and filter the
-- roster with the result, so the app logic was correct the whole time; it was
-- silently filtering against an always-empty set. A resident who skipped still
-- appeared on the crew roster with live START/DONE/FLAG controls, and the prep
-- sheet's "Vehicles expected" count included them.
--
-- Its sibling tables (washes, wash_days) each carry a *_visible SELECT policy
-- covering resident OR building manager OR operator. wash_skips never got one.
-- Mirror washes_visible exactly so the three tables agree on who can see a
-- wash day's contents.
--
-- SELECT only: creating and removing a skip stays the resident's decision, and
-- that remains governed by wash_skips_resident.

drop policy if exists wash_skips_visible on public.wash_skips;

create policy wash_skips_visible on public.wash_skips
for select using (
  exists (
    select 1 from residents r
    where r.id = wash_skips.resident_id and r.profile_id = auth.uid()
  )
  or exists (
    select 1 from wash_days wd
    join buildings b on b.id = wd.building_id
    where wd.id = wash_skips.wash_day_id and b.manager_id = auth.uid()
  )
  or exists (
    select 1 from wash_days wd
    join partnerships p on p.id = wd.partnership_id
    join operators o on o.id = p.operator_id
    where wd.id = wash_skips.wash_day_id and o.owner_id = auth.uid()
  )
);
