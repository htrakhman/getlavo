-- ============================================================
-- 0051: Let a one-off booking record which service package (Basic wash,
-- Premium detail, etc.) the resident picked, same as the recurring plan
-- already stored on residents.package_id. Nullable — most bookings still
-- price off the operator's flat building-day/on-demand rate.
-- ============================================================

alter table bookings
  add column if not exists package_id uuid references service_packages(id) on delete set null;

create index if not exists bookings_package_idx on bookings (package_id);
