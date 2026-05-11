-- Add property_type to buildings so parking garages can onboard too
create type property_type as enum (
  'apartment_building',
  'parking_garage',
  'mixed_use',
  'office_building',
  'hotel',
  'other'
);

alter table buildings
  add column if not exists property_type property_type not null default 'apartment_building';

-- Rename "total_units" to make sense for garages too — it means total leasable spots/units
comment on column buildings.total_units is
  'Total leasable units (apartments) or total spots (for garage-only properties)';
