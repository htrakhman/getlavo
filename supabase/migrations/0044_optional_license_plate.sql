-- License plate is optional information.
--
-- vehicles.license_plate shipped NOT NULL, so every write path substituted the
-- literal string 'UNKNOWN' when a resident left the field blank. That sentinel
-- then rendered verbatim everywhere a plate is shown — operator job lists, prep
-- sheets, the crew tool, the resident's own vehicle card — and worse, the
-- vehicle edit form pre-filled "UNKNOWN" into the plate input, so a resident
-- had to clear it by hand before they could type a real plate.
--
-- Make the column nullable and clear the sentinel so "no plate" is stored as
-- absence rather than as a word that looks like data.

alter table public.vehicles alter column license_plate drop not null;

update public.vehicles set license_plate = null where license_plate = 'UNKNOWN';
