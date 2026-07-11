-- Ensure residents table has vehicle access columns required by onboarding step 2.
-- Migration 0020 defined these, but they may not have been applied in all environments.
alter table residents
  add column if not exists vehicle_access_method text,
  add column if not exists vehicle_access_notes   text;
