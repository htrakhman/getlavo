-- GetGleam initial schema
-- Three actor types: building managers, residents, operators (car wash companies)
-- Auth is handled by Supabase auth.users; profile rows below link to it.

create extension if not exists "pgcrypto";

-- Restore role grants (required after schema drop/recreate)
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to authenticated, service_role;
alter default privileges in schema public grant all on sequences to authenticated, service_role;

-- ============================================================
-- Enums
-- ============================================================
create type user_role as enum ('building_manager', 'resident', 'operator', 'admin');
create type contract_term as enum ('trial_1', 'trial_3', 'month_3', 'month_6', 'year_1');
create type contract_status as enum ('pending', 'active', 'expired', 'cancelled', 'renewing');
create type operator_status as enum ('pending_review', 'approved', 'suspended', 'rejected');
create type wash_status as enum ('scheduled', 'in_progress', 'completed', 'skipped', 'flagged');
create type addon_type as enum ('interior_detail', 'wax', 'tire_shine', 'pet_hair');
create type payout_status as enum ('pending', 'paid', 'failed');

-- ============================================================
-- Profile: 1:1 with auth.users
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Operators (car wash companies)
-- ============================================================
create table operators (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  coverage_zip_codes text[] not null default '{}',
  base_price_cents int not null,
  status operator_status not null default 'pending_review',
  stripe_account_id text,
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table operator_addons (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id) on delete cascade,
  type addon_type not null,
  label text not null,
  price_cents int not null,
  active boolean not null default true,
  unique (operator_id, type)
);

-- ============================================================
-- Buildings
-- ============================================================
create table buildings (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references profiles(id) on delete restrict,
  name text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  region text not null,
  postal_code text not null,
  country text not null default 'US',
  total_units int,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  label text not null, -- e.g. "P1", "P2", "Ground"
  ordinal int not null, -- sort order, lower = higher priority on crew tool
  unique (building_id, label)
);

create table parking_spots (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references floors(id) on delete cascade,
  spot_number text not null,
  unit_number text, -- pre-assigned to a unit if known
  unique (floor_id, spot_number)
);

-- ============================================================
-- Contracts: building <-> operator
-- ============================================================
create table contracts (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  operator_id uuid not null references operators(id) on delete restrict,
  term contract_term not null,
  status contract_status not null default 'pending',
  price_per_wash_cents int not null,
  wash_frequency_days int not null default 14,
  signed_at timestamptz,
  signed_by uuid references profiles(id),
  signature_text text, -- typed signature
  starts_on date not null,
  ends_on date not null,
  auto_renew boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active contract per building at a time
create unique index contracts_one_active_per_building
  on contracts (building_id) where status = 'active';

-- ============================================================
-- Residents
-- ============================================================
create table residents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  building_id uuid not null references buildings(id) on delete restrict,
  unit_number text not null,
  parking_spot_id uuid references parking_spots(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id) on delete cascade,
  license_plate text not null,
  make text not null,
  model text not null,
  color text not null,
  year int,
  notes text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Wash days and individual washes
-- ============================================================
create table wash_days (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  building_id uuid not null references buildings(id) on delete cascade,
  scheduled_for date not null,
  crew_lead_id uuid references profiles(id),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  unique (contract_id, scheduled_for)
);

create table washes (
  id uuid primary key default gen_random_uuid(),
  wash_day_id uuid not null references wash_days(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  resident_id uuid not null references residents(id) on delete cascade,
  parking_spot_id uuid references parking_spots(id),
  status wash_status not null default 'scheduled',
  completed_at timestamptz,
  photo_url text,
  flag_reason text,
  crew_notes text
);

create index washes_wash_day_idx on washes(wash_day_id);

-- ============================================================
-- Add-on purchases (resident -> operator, charged via Stripe)
-- ============================================================
create table addon_orders (
  id uuid primary key default gen_random_uuid(),
  wash_id uuid not null references washes(id) on delete cascade,
  resident_id uuid not null references residents(id) on delete cascade,
  operator_addon_id uuid not null references operator_addons(id) on delete restrict,
  amount_cents int not null,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Reviews
-- ============================================================
create table wash_reviews (
  id uuid primary key default gen_random_uuid(),
  wash_id uuid not null unique references washes(id) on delete cascade,
  resident_id uuid not null references residents(id) on delete cascade,
  operator_id uuid not null references operators(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Issues / flags raised by managers or crew
-- ============================================================
create table issues (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  contract_id uuid references contracts(id) on delete set null,
  wash_id uuid references washes(id) on delete set null,
  raised_by uuid not null references profiles(id),
  title text not null,
  body text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Payouts to operators
-- ============================================================
create table payouts (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  gross_cents int not null,
  fee_cents int not null,
  net_cents int not null,
  status payout_status not null default 'pending',
  stripe_transfer_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Notifications (in-app)
-- ============================================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  kind text not null, -- 'wash_complete', 'contract_signed', 'issue_flagged', etc.
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on notifications(recipient_id, read_at);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

create trigger t_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger t_operators_updated before update on operators
  for each row execute function set_updated_at();
create trigger t_buildings_updated before update on buildings
  for each row execute function set_updated_at();
create trigger t_contracts_updated before update on contracts
  for each row execute function set_updated_at();

-- ============================================================
-- Row-level security
-- ============================================================
alter table profiles enable row level security;
alter table operators enable row level security;
alter table operator_addons enable row level security;
alter table buildings enable row level security;
alter table floors enable row level security;
alter table parking_spots enable row level security;
alter table contracts enable row level security;
alter table residents enable row level security;
alter table vehicles enable row level security;
alter table wash_days enable row level security;
alter table washes enable row level security;
alter table addon_orders enable row level security;
alter table wash_reviews enable row level security;
alter table issues enable row level security;
alter table payouts enable row level security;
alter table notifications enable row level security;

-- Profiles: users see/edit their own profile
create policy profiles_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Operators: public can read approved operators (for marketplace);
-- owners can read/write their own.
create policy operators_public_read on operators
  for select using (status = 'approved' or owner_id = auth.uid());
create policy operators_owner_write on operators
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy operator_addons_read on operator_addons
  for select using (
    exists (select 1 from operators o where o.id = operator_id
            and (o.status = 'approved' or o.owner_id = auth.uid())));
create policy operator_addons_write on operator_addons
  for all using (
    exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid()));

-- Buildings: manager owns; residents of a building can read; contracted operator can read.
create policy buildings_manager on buildings
  for all using (manager_id = auth.uid()) with check (manager_id = auth.uid());
create policy buildings_resident_read on buildings
  for select using (
    exists (select 1 from residents r where r.building_id = buildings.id and r.profile_id = auth.uid()));
create policy buildings_operator_read on buildings
  for select using (
    exists (select 1 from contracts c
            join operators o on o.id = c.operator_id
            where c.building_id = buildings.id
              and c.status = 'active'
              and o.owner_id = auth.uid()));

-- Floors / spots: same readers as building
create policy floors_read on floors for select using (
  exists (select 1 from buildings b where b.id = building_id and (
    b.manager_id = auth.uid()
    or exists (select 1 from residents r where r.building_id = b.id and r.profile_id = auth.uid())
    or exists (select 1 from contracts c join operators o on o.id = c.operator_id
               where c.building_id = b.id and c.status='active' and o.owner_id = auth.uid())
  )));
create policy floors_manager_write on floors for all using (
  exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid()));

create policy spots_read on parking_spots for select using (
  exists (select 1 from floors f join buildings b on b.id = f.building_id
          where f.id = floor_id and (
            b.manager_id = auth.uid()
            or exists (select 1 from residents r where r.building_id = b.id and r.profile_id = auth.uid())
            or exists (select 1 from contracts c join operators o on o.id = c.operator_id
                       where c.building_id = b.id and c.status='active' and o.owner_id = auth.uid())
          )));
create policy spots_manager_write on parking_spots for all using (
  exists (select 1 from floors f join buildings b on b.id = f.building_id
          where f.id = floor_id and b.manager_id = auth.uid()));

-- Contracts: manager + operator owner can see/manage their contracts
create policy contracts_parties on contracts for all using (
  exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
  or exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
);

-- Residents: self, plus their building's manager, plus contracted operator
create policy residents_self on residents for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
create policy residents_manager_read on residents for select using (
  exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid()));
create policy residents_operator_read on residents for select using (
  exists (select 1 from contracts c join operators o on o.id = c.operator_id
          where c.building_id = residents.building_id and c.status='active' and o.owner_id = auth.uid()));

create policy vehicles_owner on vehicles for all using (
  exists (select 1 from residents r where r.id = resident_id and r.profile_id = auth.uid())
);
create policy vehicles_visible on vehicles for select using (
  exists (select 1 from residents r where r.id = resident_id and (
    r.profile_id = auth.uid()
    or exists (select 1 from buildings b where b.id = r.building_id and b.manager_id = auth.uid())
    or exists (select 1 from contracts c join operators o on o.id = c.operator_id
               where c.building_id = r.building_id and c.status='active' and o.owner_id = auth.uid())
  )));

-- Wash days + washes: manager + operator + the wash's resident
create policy wash_days_visible on wash_days for select using (
  exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
  or exists (select 1 from contracts c join operators o on o.id = c.operator_id
             where c.id = contract_id and o.owner_id = auth.uid())
  or exists (select 1 from residents r where r.building_id = wash_days.building_id and r.profile_id = auth.uid())
);
create policy wash_days_operator_write on wash_days for all using (
  exists (select 1 from contracts c join operators o on o.id = c.operator_id
          where c.id = contract_id and o.owner_id = auth.uid())
);

create policy washes_visible on washes for select using (
  exists (select 1 from residents r where r.id = resident_id and r.profile_id = auth.uid())
  or exists (select 1 from wash_days wd join buildings b on b.id = wd.building_id
             where wd.id = wash_day_id and b.manager_id = auth.uid())
  or exists (select 1 from wash_days wd join contracts c on c.id = wd.contract_id
             join operators o on o.id = c.operator_id
             where wd.id = wash_day_id and o.owner_id = auth.uid())
);
create policy washes_operator_write on washes for all using (
  exists (select 1 from wash_days wd join contracts c on c.id = wd.contract_id
          join operators o on o.id = c.operator_id
          where wd.id = wash_day_id and o.owner_id = auth.uid())
);

create policy addon_orders_resident on addon_orders for all using (
  exists (select 1 from residents r where r.id = resident_id and r.profile_id = auth.uid())
);
create policy addon_orders_operator_read on addon_orders for select using (
  exists (select 1 from operator_addons oa join operators o on o.id = oa.operator_id
          where oa.id = operator_addon_id and o.owner_id = auth.uid())
);

create policy reviews_resident_write on wash_reviews for all using (
  exists (select 1 from residents r where r.id = resident_id and r.profile_id = auth.uid())
);
create policy reviews_public_read on wash_reviews for select using (true);

create policy issues_visible on issues for select using (
  exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
  or raised_by = auth.uid()
  or exists (select 1 from contracts c join operators o on o.id = c.operator_id
             where c.id = contract_id and o.owner_id = auth.uid())
);
create policy issues_insert on issues for insert with check (raised_by = auth.uid());

create policy payouts_operator on payouts for select using (
  exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
);

create policy notifications_self on notifications for all using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
