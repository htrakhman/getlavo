-- GetGleam strategic pivot: apartment-only hyperlocal car wash marketplace
-- Removes all B2B contract/e-sign infrastructure, parking garage schema, and
-- off-model verticals. Introduces partnerships, bookings, and geographic
-- radius matching.

-- ============================================================
-- 1. Drop B2B/contract tables (order matters: children first)
-- ============================================================

-- contract_documents references contracts
drop table if exists contract_documents cascade;
-- contract_signatures references contract_parties + contracts
drop table if exists contract_signatures cascade;
-- contract_parties references contracts + profiles
drop table if exists contract_parties cascade;
-- issues references contracts + buildings
drop table if exists issues cascade;
-- wash_reviews: drop FK to washes (will re-add to bookings)
-- addon_orders: drop FK to washes (will re-add to bookings)
-- wash_days references contracts (will alter column below)
-- washes: stays, referenced by addon_orders (handled below)

-- Drop enums used only by removed tables
drop type if exists contract_party_role cascade;
drop type if exists contract_document_kind cascade;
drop type if exists contract_term cascade;

-- ============================================================
-- 2. Drop parking-garage-specific tables
-- ============================================================
drop table if exists parking_spots cascade;
drop table if exists floors cascade;

-- ============================================================
-- 3. Drop garage_operators (third-party parking companies)
-- ============================================================
drop table if exists garage_operators cascade;

-- ============================================================
-- 4. Remove off-model columns from buildings
-- ============================================================
alter table buildings drop column if exists property_type;
alter table buildings drop column if exists garage_operator_id;
drop type if exists property_type cascade;

-- ============================================================
-- 5. Remove off-model columns from operators
-- ============================================================
alter table operators drop column if exists coverage_zip_codes;

-- ============================================================
-- 6. Remove legacy residents.parking_spot_id FK
-- ============================================================
alter table residents drop column if exists parking_spot_id;

-- ============================================================
-- 7. Remove parking_spot_id from washes
-- ============================================================
alter table washes drop column if exists parking_spot_id;

-- ============================================================
-- 8. Drop contracts last (other tables cascade-dropped already)
-- ============================================================
drop table if exists contracts cascade;
drop type if exists contract_status cascade;

-- ============================================================
-- 9. Add geographic + new business fields to buildings
-- ============================================================
alter table buildings
  add column if not exists slug          text unique,
  add column if not exists lat           numeric(9,6),
  add column if not exists lng           numeric(9,6);

create index if not exists buildings_slug_idx on buildings (slug);

-- ============================================================
-- 10. Add geographic + new business fields to operators
-- ============================================================
alter table operators
  add column if not exists lat                     numeric(9,6),
  add column if not exists lng                     numeric(9,6),
  add column if not exists service_radius_miles    int not null default 15,
  add column if not exists open_slot_price_cents   int,
  add column if not exists hours_json              jsonb,
  add column if not exists capacity_per_day        int not null default 20,
  add column if not exists promoted_listing        boolean not null default false,
  add column if not exists stripe_onboarding_complete boolean not null default false;

-- ============================================================
-- 11. Add spot_label to residents (replaces parking_spot_id)
-- ============================================================
alter table residents
  add column if not exists spot_label text;

-- ============================================================
-- 12. Add spot_label to washes (replaces parking_spot_id)
-- ============================================================
alter table washes
  add column if not exists spot_label text;

-- ============================================================
-- 13. Create partnerships table (replaces contracts)
-- ============================================================
create type partnership_status as enum ('pending', 'active', 'declined', 'inactive');

create table partnerships (
  id               uuid primary key default gen_random_uuid(),
  building_id      uuid not null references buildings(id) on delete cascade,
  operator_id      uuid not null references operators(id) on delete restrict,
  status           partnership_status not null default 'pending',
  requested_by     uuid not null references profiles(id),
  responded_at     timestamptz,
  notes            text,
  connected_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Only one active partnership per building at a time
create unique index partnerships_one_active_per_building
  on partnerships (building_id) where status = 'active';

create index partnerships_operator_idx on partnerships (operator_id, status);

alter table partnerships enable row level security;

create policy partnerships_building_manager on partnerships
  for all using (
    exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
  );

create policy partnerships_operator_read on partnerships
  for select using (
    exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
  );

create policy partnerships_operator_respond on partnerships
  for update using (
    exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
  ) with check (
    exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
  );

create trigger t_partnerships_updated before update on partnerships
  for each row execute function set_updated_at();

-- ============================================================
-- 14. Update wash_days: replace contract_id FK with partnership_id
-- ============================================================
alter table wash_days drop column if exists contract_id;
alter table wash_days
  add column if not exists partnership_id uuid references partnerships(id) on delete cascade,
  add column if not exists operator_id    uuid references operators(id) on delete restrict;

-- ============================================================
-- 15. Create bookings table (resident-initiated wash purchases)
-- ============================================================
create type booking_type   as enum ('building_day', 'open_slot');
create type booking_status as enum ('pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled');

create table bookings (
  id                       uuid primary key default gen_random_uuid(),
  resident_id              uuid not null references residents(id) on delete restrict,
  operator_id              uuid not null references operators(id) on delete restrict,
  building_id              uuid not null references buildings(id) on delete restrict,
  vehicle_id               uuid not null references vehicles(id) on delete restrict,
  partnership_id           uuid references partnerships(id) on delete set null,
  wash_day_id              uuid references wash_days(id) on delete set null,
  booking_type             booking_type not null default 'open_slot',
  scheduled_for            date not null,
  time_slot                text,
  status                   booking_status not null default 'pending_payment',
  gross_cents              int not null,
  fee_cents                int not null,
  net_cents                int not null,
  stripe_payment_intent_id text,
  paid_at                  timestamptz,
  completed_at             timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index bookings_resident_idx   on bookings (resident_id, scheduled_for desc);
create index bookings_operator_idx   on bookings (operator_id, scheduled_for desc);
create index bookings_building_idx   on bookings (building_id, status);
create index bookings_wash_day_idx   on bookings (wash_day_id);

alter table bookings enable row level security;

create policy bookings_resident on bookings
  for all using (
    exists (select 1 from residents r where r.id = resident_id and r.profile_id = auth.uid())
  );

create policy bookings_operator_read on bookings
  for select using (
    exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
  );

create policy bookings_operator_write on bookings
  for update using (
    exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
  );

create policy bookings_building_read on bookings
  for select using (
    exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
  );

create trigger t_bookings_updated before update on bookings
  for each row execute function set_updated_at();

-- ============================================================
-- 16. Update addon_orders: add booking_id column alongside wash_id
--     (wash_id kept for backwards compat with existing crew tool rows)
-- ============================================================
alter table addon_orders
  add column if not exists booking_id uuid references bookings(id) on delete cascade;

-- ============================================================
-- 17. Update wash_reviews: add booking_id column
-- ============================================================
alter table wash_reviews
  add column if not exists booking_id uuid references bookings(id) on delete cascade;

-- ============================================================
-- 18. Update RLS policies that referenced contracts
-- ============================================================

-- buildings: operators now visible via partnerships
drop policy if exists buildings_operator_read on buildings;
create policy buildings_operator_read on buildings
  for select using (
    exists (
      select 1 from partnerships p
      join operators o on o.id = p.operator_id
      where p.building_id = buildings.id
        and p.status = 'active'
        and o.owner_id = auth.uid()
    )
  );

-- residents: operators visible via partnerships
drop policy if exists residents_operator_read on residents;
create policy residents_operator_read on residents
  for select using (
    exists (
      select 1 from partnerships p
      join operators o on o.id = p.operator_id
      where p.building_id = residents.building_id
        and p.status = 'active'
        and o.owner_id = auth.uid()
    )
  );

-- vehicles: operators visible via partnerships
drop policy if exists vehicles_visible on vehicles;
create policy vehicles_visible on vehicles
  for select using (
    exists (
      select 1 from residents r where r.id = resident_id and (
        r.profile_id = auth.uid()
        or exists (select 1 from buildings b where b.id = r.building_id and b.manager_id = auth.uid())
        or exists (
          select 1 from partnerships p
          join operators o on o.id = p.operator_id
          where p.building_id = r.building_id
            and p.status = 'active'
            and o.owner_id = auth.uid()
        )
      )
    )
  );

-- wash_days: operator access now via partnerships
drop policy if exists wash_days_visible on wash_days;
create policy wash_days_visible on wash_days
  for select using (
    exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
    or exists (
      select 1 from partnerships p
      join operators o on o.id = p.operator_id
      where p.id = partnership_id and o.owner_id = auth.uid()
    )
    or exists (
      select 1 from residents r
      where r.building_id = wash_days.building_id and r.profile_id = auth.uid()
    )
  );

drop policy if exists wash_days_operator_write on wash_days;
create policy wash_days_operator_write on wash_days
  for all using (
    exists (
      select 1 from partnerships p
      join operators o on o.id = p.operator_id
      where p.id = partnership_id and o.owner_id = auth.uid()
    )
  );

-- washes: operator access now via partnerships (through wash_days)
drop policy if exists washes_visible on washes;
create policy washes_visible on washes
  for select using (
    exists (select 1 from residents r where r.id = resident_id and r.profile_id = auth.uid())
    or exists (
      select 1 from wash_days wd
      join buildings b on b.id = wd.building_id
      where wd.id = wash_day_id and b.manager_id = auth.uid()
    )
    or exists (
      select 1 from wash_days wd
      join partnerships p on p.id = wd.partnership_id
      join operators o on o.id = p.operator_id
      where wd.id = wash_day_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists washes_operator_write on washes;
create policy washes_operator_write on washes
  for all using (
    exists (
      select 1 from wash_days wd
      join partnerships p on p.id = wd.partnership_id
      join operators o on o.id = p.operator_id
      where wd.id = wash_day_id and o.owner_id = auth.uid()
    )
  );

-- operators: gate marketplace visibility on stripe_onboarding_complete
drop policy if exists operators_public_read on operators;
create policy operators_public_read on operators
  for select using (
    (status = 'approved' and stripe_onboarding_complete = true)
    or owner_id = auth.uid()
  );

-- ============================================================
-- 19. Operator add-ons: update read policy (same logic, no change needed)
-- ============================================================
drop policy if exists operator_addons_read on operator_addons;
create policy operator_addons_read on operator_addons
  for select using (
    exists (
      select 1 from operators o where o.id = operator_id
      and (
        (o.status = 'approved' and o.stripe_onboarding_complete = true)
        or o.owner_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 20. Clean up contracts storage bucket
-- ============================================================
delete from storage.objects where bucket_id = 'contracts';
delete from storage.buckets where id = 'contracts';
