create table building_interest (
  id uuid primary key default gen_random_uuid(),
  building_name text not null,
  created_at timestamptz not null default now()
);
