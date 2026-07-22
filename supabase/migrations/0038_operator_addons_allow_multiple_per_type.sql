-- Operators offer more than one add-on in the same category (e.g. two
-- interior services), but operator_addons carried a unique (operator_id, type)
-- constraint from the initial schema. That capped each operator at one add-on
-- per type, so adding a second add-on of an already-used category failed with a
-- duplicate-key error. Add-ons are always fetched as a list and referenced by
-- their own id (bookings, resident_addons, checkout), so nothing depends on the
-- type being unique per operator — drop the constraint.
alter table operator_addons
  drop constraint if exists operator_addons_operator_id_type_key;
