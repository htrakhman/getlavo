-- Store resident-entered building name and address on waitlist for reliable activation matching.

alter table building_waitlist
  add column if not exists building_label text,
  add column if not exists formatted_address text;

create index if not exists building_waitlist_label_idx
  on building_waitlist (lower(building_label))
  where building_label is not null;
