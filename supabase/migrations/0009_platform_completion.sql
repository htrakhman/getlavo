-- GetGleam platform completion: assigned-operator model + crew tool data
-- Adds: service_packages, building wash_day, garage layout, issues table v2,
-- floor preview, resident subscription, insurance, admin role, contracts e-sign v2.

-- ============================================================
-- 1. Buildings: cadence + preferred wash day + slug + status (if missing)
-- ============================================================
do $$ begin
  create type building_status as enum ('lead', 'prospect', 'pilot', 'active', 'paused', 'churned');
exception when duplicate_object then null; end $$;

alter table buildings add column if not exists slug                 text unique;
alter table buildings add column if not exists status               building_status not null default 'prospect';
alter table buildings add column if not exists wash_day             text;
alter table buildings add column if not exists wash_cadence         text default 'weekly';
alter table buildings add column if not exists preferred_wash_day   text;
alter table buildings add column if not exists is_seed              boolean not null default false;
alter table buildings add column if not exists garage_levels_json   jsonb;

-- ============================================================
-- 2. Operators: insurance + contact + onboarding flag
-- ============================================================
alter table operators add column if not exists contact_email          text;
alter table operators add column if not exists contact_phone          text;
alter table operators add column if not exists insurance_carrier      text;
alter table operators add column if not exists insurance_doc_url      text;
alter table operators add column if not exists insurance_expires_at   date;
alter table operators add column if not exists insurance_uploaded_at  timestamptz;
alter table operators add column if not exists is_seed                boolean not null default false;

-- ============================================================
-- 3. Service packages (what residents pick during onboarding)
-- ============================================================
create table if not exists service_packages (
  id            uuid primary key default gen_random_uuid(),
  operator_id   uuid not null references operators(id) on delete cascade,
  name          text not null,
  description   text,
  price_cents   int not null,
  est_minutes   int,
  active        boolean not null default true,
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists service_packages_operator_idx on service_packages (operator_id, active);

alter table service_packages enable row level security;

drop policy if exists service_packages_public_read on service_packages;
create policy service_packages_public_read on service_packages
  for select using (
    active = true
    or exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
  );

drop policy if exists service_packages_owner_write on service_packages;
create policy service_packages_owner_write on service_packages
  for all using (
    exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
  );

-- ============================================================
-- 4. Residents: subscription + spot/floor + Stripe customer
-- ============================================================
alter table residents add column if not exists floor_number             int;
alter table residents add column if not exists is_subscribed            boolean not null default false;
alter table residents add column if not exists package_id               uuid references service_packages(id) on delete set null;
alter table residents add column if not exists stripe_customer_id       text;
alter table residents add column if not exists stripe_payment_method_id text;
alter table residents add column if not exists notification_preferences jsonb default '{"email_reminder":true,"sms_reminder":true,"email_complete":true,"sms_complete":true}'::jsonb;

-- ============================================================
-- 5. Resident recurring add-ons
-- ============================================================
create table if not exists resident_addons (
  id          uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id) on delete cascade,
  operator_addon_id uuid not null references operator_addons(id) on delete cascade,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists resident_addons_resident_idx on resident_addons (resident_id, active);
alter table resident_addons enable row level security;
drop policy if exists resident_addons_owner on resident_addons;
create policy resident_addons_owner on resident_addons for all using (
  exists (select 1 from residents r where r.id = resident_id and r.profile_id = auth.uid())
);

-- ============================================================
-- 6. Wash skips (resident skips an upcoming wash day)
-- ============================================================
create table if not exists wash_skips (
  id           uuid primary key default gen_random_uuid(),
  resident_id  uuid not null references residents(id) on delete cascade,
  wash_day_id  uuid not null references wash_days(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (resident_id, wash_day_id)
);
alter table wash_skips enable row level security;
drop policy if exists wash_skips_resident on wash_skips;
create policy wash_skips_resident on wash_skips for all using (
  exists (select 1 from residents r where r.id = resident_id and r.profile_id = auth.uid())
);

-- ============================================================
-- 7. Issues table v2 (rebuild — may have been dropped earlier)
-- ============================================================
create table if not exists issues (
  id            uuid primary key default gen_random_uuid(),
  building_id   uuid not null references buildings(id) on delete cascade,
  reporter_id   uuid references profiles(id) on delete set null,
  type          text not null,
  description   text not null,
  status        text not null default 'open' check (status in ('open','in_progress','resolved')),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists issues_building_idx on issues (building_id, status);
alter table issues enable row level security;
drop policy if exists issues_manager on issues;
create policy issues_manager on issues for all using (
  exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
);
drop policy if exists issues_admin on issues;
create policy issues_admin on issues for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ============================================================
-- 8. Building interest: support email + building_id (for /b/[slug] notify-me)
-- ============================================================
alter table building_interest add column if not exists building_id uuid references buildings(id) on delete cascade;
alter table building_interest add column if not exists email text;
alter table building_interest alter column building_name drop not null;

-- ============================================================
-- 9. Contracts (light-weight e-sign)
-- ============================================================
do $$ begin
  create type contract_status as enum ('draft', 'pending_signatures', 'executed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists contracts (
  id              uuid primary key default gen_random_uuid(),
  building_id     uuid not null references buildings(id) on delete cascade,
  operator_id     uuid references operators(id) on delete set null,
  status          contract_status not null default 'draft',
  pdf_url         text,
  manager_signed_by   uuid references profiles(id),
  manager_signed_at   timestamptz,
  manager_signed_name text,
  operator_signed_by  uuid references profiles(id),
  operator_signed_at  timestamptz,
  operator_signed_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists contracts_building_idx on contracts (building_id);
alter table contracts enable row level security;
drop policy if exists contracts_manager on contracts;
create policy contracts_manager on contracts for all using (
  exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
);
drop policy if exists contracts_operator on contracts for select;
create policy contracts_operator on contracts for select using (
  exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
);
drop policy if exists contracts_admin on contracts;
create policy contracts_admin on contracts for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ============================================================
-- 10. Notifications: extend kind values (no schema change, just docs)
--     Used: 'wash_complete', 'wash_flagged', 'wash_reminder', 'payment_failed',
--           'pilot_signed', 'operator_assigned'
-- ============================================================

-- ============================================================
-- 11. Wash records (compatibility view alias)
--     Spec uses "wash_records" but core table is "washes". Add view alias.
-- ============================================================
-- (View not strictly necessary — code uses 'washes' directly.)

-- ============================================================
-- 12. Building assignments helper (alias on partnerships for spec parity)
-- ============================================================
-- partnerships table already serves this role. No new table needed.

-- ============================================================
-- 13. Touch updated_at trigger for new tables
-- ============================================================
do $$ begin
  create trigger t_service_packages_updated before update on service_packages
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger t_contracts_updated before update on contracts
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;
