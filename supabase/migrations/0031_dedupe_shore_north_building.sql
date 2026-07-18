-- Superseded by 0034_dedupe_duplicate_buildings.sql.
--
-- The original version of this migration updated a "building_managers" table
-- that has never existed, so the DO block errored whenever duplicates were
-- present and the dedupe never actually ran (the duplicate "The Shore North —
-- Jersey City" rows survived it). It also missed several tables that hold a
-- building_id FK (partnerships, bookings, floors, ...). 0034 re-points every
-- FK discovered from the catalog and adds a unique index; this file is kept
-- as a no-op so migration numbering stays contiguous.
select 1;
