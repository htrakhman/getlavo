-- Address-check widget: capture unserved addresses with a normalized,
-- groupable form so the admin demand view can collapse "123 Main St",
-- "123 Main Street Apt 4B", and "123 main st." into one prospect row.
--
-- building_label and formatted_address are included here even though they
-- were already written in 0025_building_waitlist_labels.sql: that migration
-- was never applied to production (confirmed via information_schema — neither
-- column exists on the live table), so every waitlist insert since has been
-- silently falling through insertBuildingWaitlistRow's legacy branch with no
-- label or address saved. Repeating the `add column if not exists` here is
-- the fix; it is a no-op if 0025 is later reconciled.

alter table building_waitlist
  add column if not exists building_label text,
  add column if not exists formatted_address text,
  add column if not exists normalized_address text,
  add column if not exists address_key text,
  add column if not exists unit text,
  add column if not exists unit_count int,
  add column if not exists source_page text,
  add column if not exists place_id text,
  add column if not exists lat numeric(9,6),
  add column if not exists lng numeric(9,6);

comment on column building_waitlist.normalized_address is
  'Canonical readable form from lib/address-normalize.ts, e.g. "123 Main St, Jersey City, NJ 07302". Display only.';
comment on column building_waitlist.address_key is
  'Grouping key from lib/address-normalize.ts. Not unique per row on purpose — every signup at one building keeps its own row; the admin view groups on this.';
comment on column building_waitlist.unit_count is
  'buildings.total_units when the address resolved to a known building. Null when unresolved or unknown — never guessed.';
comment on column building_waitlist.source_page is
  'Path of the page the address-check widget was embedded on, e.g. /cities/jersey-city.';

create index if not exists building_waitlist_address_key_idx
  on building_waitlist (address_key)
  where address_key is not null;

create index if not exists building_waitlist_label_idx
  on building_waitlist (lower(building_label))
  where building_label is not null;
