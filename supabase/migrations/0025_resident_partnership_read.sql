-- Allow residents to read active partnerships for their own building.
-- Without this, the resident booking and add-ons pages cannot see their building's operator.
drop policy if exists partnerships_resident_read on partnerships;
create policy partnerships_resident_read on partnerships
  for select using (
    exists (
      select 1 from residents r
      where r.building_id = partnerships.building_id
        and r.profile_id = auth.uid()
    )
  );
