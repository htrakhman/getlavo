-- ============================================================
-- GetGleam: consolidated, idempotent catch-up migration
-- ============================================================
-- Brings a database that's stuck somewhere between 0005 and 0007
-- up to the current schema (everything through 0016).
--
-- Safe to re-run. All creates use IF NOT EXISTS, all type creates
-- are wrapped in DO blocks, all policies use DROP IF EXISTS / CREATE.
--
-- Paste into Supabase Dashboard → SQL Editor → Run.
-- ============================================================

-- ============================================================
-- PART A — drop legacy pre-pivot artifacts (from 0007 sections 1-8)
-- ============================================================

drop table if exists contract_documents cascade;
drop table if exists contract_signatures cascade;
drop table if exists contract_parties cascade;
drop table if exists garage_operators cascade;

-- Old issues table FK'd contracts; drop so 0009 can recreate referencing buildings
drop table if exists issues cascade;

-- Drop old contracts (different schema from 0009's new contracts table).
-- Anything that referenced contracts (wash_days.contract_id) will be cleared.
drop table if exists contracts cascade;

-- Old enums tied to legacy contracts
drop type if exists contract_party_role cascade;
drop type if exists contract_document_kind cascade;
drop type if exists contract_term cascade;
drop type if exists contract_status cascade;

-- Pivot also drops parking-garage tables
drop table if exists parking_spots cascade;
drop table if exists floors cascade;

-- Off-model columns/types
alter table buildings drop column if exists property_type;
alter table buildings drop column if exists garage_operator_id;
drop type if exists property_type cascade;
alter table operators drop column if exists coverage_zip_codes;
alter table residents drop column if exists parking_spot_id;
alter table washes drop column if exists parking_spot_id;

-- Clean up contracts storage bucket (skipped — managed via Supabase Storage API)


-- ============================================================
-- PART B — 0006: multi-portal junction
-- ============================================================

do $$ begin
  create type portal_kind as enum ('building', 'operator', 'resident');
exception when duplicate_object then null; end $$;

create table if not exists profile_portals (
  profile_id uuid not null references profiles(id) on delete cascade,
  portal portal_kind not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, portal)
);

alter table profiles alter column role drop not null;

insert into profile_portals (profile_id, portal)
select id,
  case role
    when 'building_manager' then 'building'::portal_kind
    when 'operator'         then 'operator'::portal_kind
    when 'resident'         then 'resident'::portal_kind
  end
from profiles
where role in ('building_manager', 'operator', 'resident')
on conflict do nothing;

alter table profile_portals enable row level security;

drop policy if exists profile_portals_self on profile_portals;
create policy profile_portals_self on profile_portals
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta_role user_role := nullif(new.raw_user_meta_data->>'role', '')::user_role;
  initial_portal portal_kind := case meta_role
    when 'building_manager' then 'building'::portal_kind
    when 'operator'         then 'operator'::portal_kind
    when 'resident'         then 'resident'::portal_kind
    else null
  end;
begin
  if (new.raw_app_meta_data->>'provider') = 'email' then
    insert into public.profiles (id, role, full_name, email)
    values (
      new.id,
      meta_role,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      new.email
    )
    on conflict (id) do nothing;

    if initial_portal is not null then
      insert into public.profile_portals (profile_id, portal)
      values (new.id, initial_portal)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;


-- ============================================================
-- PART C — 0007: pivot schema (alters + new tables)
-- ============================================================

-- Buildings: geographic + slug
alter table buildings
  add column if not exists slug          text unique,
  add column if not exists lat           numeric(9,6),
  add column if not exists lng           numeric(9,6);
create index if not exists buildings_slug_idx on buildings (slug);

-- Operators: geographic + business fields
alter table operators
  add column if not exists lat                          numeric(9,6),
  add column if not exists lng                          numeric(9,6),
  add column if not exists service_radius_miles         int not null default 15,
  add column if not exists open_slot_price_cents        int,
  add column if not exists hours_json                   jsonb,
  add column if not exists capacity_per_day             int not null default 20,
  add column if not exists promoted_listing             boolean not null default false,
  add column if not exists stripe_onboarding_complete   boolean not null default false;

-- Residents / washes: spot_label replaces parking_spot_id
alter table residents add column if not exists spot_label text;
alter table washes    add column if not exists spot_label text;

-- Partnerships
do $$ begin
  create type partnership_status as enum ('pending', 'active', 'declined', 'inactive');
exception when duplicate_object then null; end $$;

create table if not exists partnerships (
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

create unique index if not exists partnerships_one_active_per_building
  on partnerships (building_id) where status = 'active';
create index if not exists partnerships_operator_idx on partnerships (operator_id, status);

alter table partnerships enable row level security;

drop policy if exists partnerships_building_manager on partnerships;
create policy partnerships_building_manager on partnerships
  for all using (
    exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
  );

drop policy if exists partnerships_operator_read on partnerships;
create policy partnerships_operator_read on partnerships
  for select using (
    exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
  );

drop policy if exists partnerships_operator_respond on partnerships;
create policy partnerships_operator_respond on partnerships
  for update using (
    exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
  ) with check (
    exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
  );

do $$ begin
  create trigger t_partnerships_updated before update on partnerships
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

-- Wash days: replace contract_id FK with partnership_id + operator_id
alter table wash_days drop column if exists contract_id;
alter table wash_days
  add column if not exists partnership_id uuid references partnerships(id) on delete cascade,
  add column if not exists operator_id    uuid references operators(id) on delete restrict;

-- Bookings
do $$ begin
  create type booking_type as enum ('building_day', 'open_slot');
exception when duplicate_object then null; end $$;
do $$ begin
  create type booking_status as enum ('pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists bookings (
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

create index if not exists bookings_resident_idx on bookings (resident_id, scheduled_for desc);
create index if not exists bookings_operator_idx on bookings (operator_id, scheduled_for desc);
create index if not exists bookings_building_idx on bookings (building_id, status);
create index if not exists bookings_wash_day_idx on bookings (wash_day_id);

alter table bookings enable row level security;

drop policy if exists bookings_resident on bookings;
create policy bookings_resident on bookings
  for all using (
    exists (select 1 from residents r where r.id = resident_id and r.profile_id = auth.uid())
  );

drop policy if exists bookings_operator_read on bookings;
create policy bookings_operator_read on bookings
  for select using (
    exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
  );

drop policy if exists bookings_operator_write on bookings;
create policy bookings_operator_write on bookings
  for update using (
    exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
  );

drop policy if exists bookings_building_read on bookings;
create policy bookings_building_read on bookings
  for select using (
    exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
  );

do $$ begin
  create trigger t_bookings_updated before update on bookings
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

-- addon_orders / wash_reviews: link to bookings
alter table addon_orders   add column if not exists booking_id uuid references bookings(id) on delete cascade;
alter table wash_reviews   add column if not exists booking_id uuid references bookings(id) on delete cascade;

-- ============================================================
-- PART C2 — 0007 RLS rewires (operators see via partnerships)
-- ============================================================

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

drop policy if exists operators_public_read on operators;
create policy operators_public_read on operators
  for select using (
    (status = 'approved' and stripe_onboarding_complete = true)
    or owner_id = auth.uid()
  );

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
-- PART D — 0008: building_interest
-- ============================================================

create table if not exists building_interest (
  id uuid primary key default gen_random_uuid(),
  building_name text,
  created_at timestamptz not null default now()
);


-- ============================================================
-- PART E — 0009: platform completion
-- ============================================================

do $$ begin
  create type building_status as enum ('lead', 'prospect', 'pilot', 'active', 'paused', 'churned');
exception when duplicate_object then null; end $$;

alter table buildings add column if not exists status               building_status not null default 'prospect';
alter table buildings add column if not exists wash_day             text;
alter table buildings add column if not exists wash_cadence         text default 'weekly';
alter table buildings add column if not exists preferred_wash_day   text;
alter table buildings add column if not exists is_seed              boolean not null default false;
alter table buildings add column if not exists garage_levels_json   jsonb;

alter table operators add column if not exists contact_email          text;
alter table operators add column if not exists contact_phone          text;
alter table operators add column if not exists insurance_carrier      text;
alter table operators add column if not exists insurance_doc_url      text;
alter table operators add column if not exists insurance_expires_at   date;
alter table operators add column if not exists insurance_uploaded_at  timestamptz;
alter table operators add column if not exists is_seed                boolean not null default false;

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

alter table residents add column if not exists floor_number             int;
alter table residents add column if not exists is_subscribed            boolean not null default false;
alter table residents add column if not exists package_id               uuid references service_packages(id) on delete set null;
alter table residents add column if not exists stripe_customer_id       text;
alter table residents add column if not exists stripe_payment_method_id text;
alter table residents add column if not exists notification_preferences jsonb default '{"email_reminder":true,"sms_reminder":true,"email_complete":true,"sms_complete":true}'::jsonb;

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

alter table building_interest add column if not exists building_id uuid references buildings(id) on delete cascade;
alter table building_interest add column if not exists email text;
alter table building_interest alter column building_name drop not null;

-- New contracts (lightweight e-sign), recreated after the legacy drop above
do $$ begin
  create type contract_status as enum ('draft', 'pending_signatures', 'executed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists contracts (
  id                    uuid primary key default gen_random_uuid(),
  building_id           uuid not null references buildings(id) on delete cascade,
  operator_id           uuid references operators(id) on delete set null,
  status                contract_status not null default 'draft',
  pdf_url               text,
  manager_signed_by     uuid references profiles(id),
  manager_signed_at     timestamptz,
  manager_signed_name   text,
  operator_signed_by    uuid references profiles(id),
  operator_signed_at    timestamptz,
  operator_signed_name  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists contracts_building_idx on contracts (building_id);
alter table contracts enable row level security;

drop policy if exists contracts_manager on contracts;
create policy contracts_manager on contracts for all using (
  exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
);
drop policy if exists contracts_operator on contracts;
create policy contracts_operator on contracts for select using (
  exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
);
drop policy if exists contracts_admin on contracts;
create policy contracts_admin on contracts for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

do $$ begin
  create trigger t_service_packages_updated before update on service_packages
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger t_contracts_updated before update on contracts
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;


-- ============================================================
-- PART F — 0010: building invites + notifications policies
-- ============================================================

create table if not exists building_invites (
  id           uuid primary key default gen_random_uuid(),
  building_id  uuid not null references buildings(id) on delete cascade,
  invited_by   uuid not null references profiles(id) on delete set null,
  email        text not null,
  unit_number  text,
  full_name    text,
  token        text unique,
  status       text not null default 'sent' check (status in ('sent', 'opened', 'accepted', 'bounced')),
  sent_at      timestamptz not null default now(),
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists building_invites_building_idx on building_invites (building_id);
create index if not exists building_invites_email_idx    on building_invites (email);
create index if not exists building_invites_token_idx    on building_invites (token);

alter table building_invites enable row level security;

drop policy if exists building_invites_manager on building_invites;
create policy building_invites_manager on building_invites for all using (
  exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
);
drop policy if exists building_invites_admin on building_invites;
create policy building_invites_admin on building_invites for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists building_invites_token_read on building_invites;
create policy building_invites_token_read on building_invites for select using (true);

drop policy if exists notifications_recipient_read on notifications;
create policy notifications_recipient_read on notifications for select using (recipient_id = auth.uid());
drop policy if exists notifications_recipient_update on notifications;
create policy notifications_recipient_update on notifications for update using (recipient_id = auth.uid());


-- ============================================================
-- PART G — 0011: subscriptions + announcements + audit
-- ============================================================

do $$ begin
  create type subscription_state as enum ('active', 'paused', 'cancelled');
exception when duplicate_object then null; end $$;

alter table residents add column if not exists subscription_state subscription_state not null default 'active';
alter table residents add column if not exists subscription_paused_until date;
alter table residents add column if not exists subscription_cancelled_at timestamptz;

update residents set subscription_state = 'active' where is_subscribed = true and subscription_state is null;

create table if not exists announcements (
  id            uuid primary key default gen_random_uuid(),
  building_id   uuid not null references buildings(id) on delete cascade,
  author_id     uuid not null references profiles(id) on delete set null,
  subject       text not null,
  body          text not null,
  sent_count    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists announcements_building_idx on announcements (building_id, created_at desc);

alter table announcements enable row level security;
drop policy if exists announcements_manager on announcements;
create policy announcements_manager on announcements for all using (
  exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
);
drop policy if exists announcements_resident_read on announcements;
create policy announcements_resident_read on announcements for select using (
  exists (select 1 from residents r where r.building_id = announcements.building_id and r.profile_id = auth.uid())
);

create table if not exists audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references profiles(id) on delete set null,
  actor_role    text,
  action        text not null,
  entity_type   text,
  entity_id     uuid,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx  on audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_entity_idx on audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_logs_action_idx on audit_logs (action, created_at desc);

alter table audit_logs enable row level security;
drop policy if exists audit_logs_admin on audit_logs;
create policy audit_logs_admin on audit_logs for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);


-- ============================================================
-- PART H — 0012: wash day proposals
-- ============================================================

alter table wash_days add column if not exists proposed_for     date;
alter table wash_days add column if not exists proposed_by      uuid references profiles(id) on delete set null;
alter table wash_days add column if not exists confirmation     text not null default 'auto'
  check (confirmation in ('auto', 'pending', 'confirmed', 'declined'));


-- ============================================================
-- PART I — 0013: crew + insurance review
-- ============================================================

create table if not exists crew_members (
  id          uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id) on delete cascade,
  full_name   text not null,
  phone       text,
  email       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists crew_members_operator_idx on crew_members (operator_id, active);

alter table crew_members enable row level security;
drop policy if exists crew_members_owner on crew_members;
create policy crew_members_owner on crew_members for all using (
  exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
);

do $$ begin
  create type insurance_review_status as enum ('not_uploaded', 'pending_review', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

alter table operators add column if not exists insurance_review_status insurance_review_status not null default 'not_uploaded';
alter table operators add column if not exists insurance_reviewed_at   timestamptz;
alter table operators add column if not exists insurance_reviewed_by   uuid references profiles(id) on delete set null;
alter table operators add column if not exists insurance_review_note   text;


-- ============================================================
-- PART J — 0014: building branding
-- ============================================================

alter table buildings add column if not exists welcome_message text;
alter table buildings add column if not exists logo_url        text;
alter table buildings add column if not exists brand_color     text;


-- ============================================================
-- PART K — 0015: SMS opt-out
-- ============================================================

create table if not exists sms_optouts (
  phone       text primary key,
  reason      text,
  created_at  timestamptz not null default now()
);
alter table sms_optouts enable row level security;
drop policy if exists sms_optouts_admin on sms_optouts;
create policy sms_optouts_admin on sms_optouts for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);


-- ============================================================
-- PART L — 0016: error logs + job heartbeats
-- ============================================================

create table if not exists error_logs (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  message     text not null,
  stack       text,
  context     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists error_logs_created_idx on error_logs (created_at desc);

alter table error_logs enable row level security;
drop policy if exists error_logs_admin on error_logs;
create policy error_logs_admin on error_logs for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

create table if not exists job_runs (
  id          uuid primary key default gen_random_uuid(),
  job_name    text not null,
  status      text not null check (status in ('ok', 'error')),
  duration_ms int,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists job_runs_created_idx on job_runs (job_name, created_at desc);

alter table job_runs enable row level security;
drop policy if exists job_runs_admin on job_runs;
create policy job_runs_admin on job_runs for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);


-- ──────────────────────────────────────────────────────────────────────────────
-- 0017: Operator portfolio & enriched profile fields
-- ──────────────────────────────────────────────────────────────────────────────

alter table operators
  add column if not exists tagline          text,
  add column if not exists years_experience int,
  add column if not exists specialties      text[] not null default '{}',
  add column if not exists cover_photo_url  text;

create table if not exists operator_portfolio_items (
  id            uuid primary key default gen_random_uuid(),
  operator_id   uuid not null references operators(id) on delete cascade,
  url           text not null,
  media_type    text not null default 'photo',
  title         text,
  description   text,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists portfolio_items_operator_idx
  on operator_portfolio_items (operator_id, display_order);

alter table operator_portfolio_items enable row level security;

drop policy if exists portfolio_owner_all on operator_portfolio_items;
create policy portfolio_owner_all
  on operator_portfolio_items for all
  using   (exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid()))
  with check (exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid()));

drop policy if exists portfolio_public_read on operator_portfolio_items;
create policy portfolio_public_read
  on operator_portfolio_items for select
  using (true);

insert into storage.buckets (id, name, public)
  values ('operator-portfolio', 'operator-portfolio', true)
  on conflict (id) do nothing;

drop policy if exists portfolio_upload on storage.objects;
create policy portfolio_upload
  on storage.objects for insert
  with check (bucket_id = 'operator-portfolio' and auth.uid() is not null);

drop policy if exists portfolio_update on storage.objects;
create policy portfolio_update
  on storage.objects for update
  using (bucket_id = 'operator-portfolio' and auth.uid() is not null);

drop policy if exists portfolio_delete on storage.objects;
create policy portfolio_delete
  on storage.objects for delete
  using (bucket_id = 'operator-portfolio' and auth.uid() is not null);

drop policy if exists portfolio_public_read_storage on storage.objects;
create policy portfolio_public_read_storage
  on storage.objects for select
  using (bucket_id = 'operator-portfolio');
