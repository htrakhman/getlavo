-- ============================================================
-- Catch-up migration: 0017 → 0023
-- Safe to run against a database already at migration 0016.
-- All statements are idempotent.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0017: Operator portfolio & enriched profile fields
-- ─────────────────────────────────────────────────────────────

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


-- ─────────────────────────────────────────────────────────────
-- 0018: Fix buildings RLS infinite recursion
-- ─────────────────────────────────────────────────────────────

alter table buildings enable row level security;

drop policy if exists buildings_resident_read on buildings;
drop policy if exists buildings_operator_read on buildings;
drop policy if exists buildings_authenticated_read on buildings;
drop policy if exists buildings_public_read on buildings;

create policy buildings_public_read on buildings
  for select
  using (status in ('prospect', 'pilot', 'active'));


-- ─────────────────────────────────────────────────────────────
-- 0019: Backfill profile_portals
-- ─────────────────────────────────────────────────────────────

insert into profile_portals (profile_id, portal)
select id,
  case role
    when 'building_manager' then 'building'::portal_kind
    when 'operator'         then 'operator'::portal_kind
    when 'resident'         then 'resident'::portal_kind
  end
from profiles
where role in ('building_manager', 'operator', 'resident')
  and id not in (select profile_id from profile_portals)
on conflict do nothing;


-- ─────────────────────────────────────────────────────────────
-- 0020: Pre-launch funnel tables
-- ─────────────────────────────────────────────────────────────

alter table buildings
  add column if not exists google_place_id text;

create unique index if not exists buildings_google_place_id_uidx
  on buildings (google_place_id)
  where google_place_id is not null;

-- Enums (idempotent via DO block)
do $$ begin
  create type building_request_source as enum ('organic', 'ad', 'referral');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type building_request_channel as enum (
    'check_flow',
    'email_mgmt',
    'neighbor_share',
    'waitlist_join',
    'homeowner_waitlist',
    'plus_one'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type promo_discount_kind as enum ('percent', 'fixed_cents', 'free_first_wash', 'free_upgrade');
exception when duplicate_object then null;
end $$;

create table if not exists building_requests (
  id                    uuid primary key default gen_random_uuid(),
  building_id           uuid references buildings(id) on delete set null,
  resident_id           uuid references residents(id) on delete set null,
  profile_id            uuid references profiles(id) on delete set null,
  requested_at          timestamptz not null default now(),
  source                building_request_source not null default 'organic',
  channel               building_request_channel not null default 'check_flow',
  building_candidate_key text not null,
  place_id              text,
  formatted_address     text,
  building_display_name text,
  unit                  text,
  vehicle_json          jsonb,
  mgmt_email            text,
  mgmt_email_sent_at    timestamptz,
  resident_name         text,
  resident_email        text,
  resident_phone        text,
  utm_source            text,
  utm_medium            text,
  utm_campaign          text
);

create index if not exists building_requests_candidate_idx on building_requests (building_candidate_key, requested_at desc);
create index if not exists building_requests_building_idx on building_requests (building_id, requested_at desc);

create table if not exists building_waitlist (
  id                     uuid primary key default gen_random_uuid(),
  building_id            uuid references buildings(id) on delete cascade,
  building_candidate_key text not null,
  profile_id             uuid references profiles(id) on delete set null,
  email                  text,
  phone                  text,
  full_name              text,
  notify_sms             boolean not null default true,
  notify_email           boolean not null default true,
  activation_promo_code  text,
  notified_activation_at timestamptz,
  created_at             timestamptz not null default now()
);

create index if not exists building_waitlist_candidate_idx on building_waitlist (building_candidate_key);
create index if not exists building_waitlist_building_idx on building_waitlist (building_id);

create table if not exists building_share_links (
  id                    uuid primary key default gen_random_uuid(),
  token                 text not null unique,
  building_id           uuid references buildings(id) on delete set null,
  building_candidate_key text not null,
  created_by_request_id uuid references building_requests(id) on delete set null,
  click_count           int not null default 0,
  created_at            timestamptz not null default now()
);

create index if not exists building_share_links_token_idx on building_share_links (token);

create table if not exists homeowner_waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  partner_slug text,
  place_id     text,
  created_at   timestamptz not null default now()
);

create table if not exists building_request_threshold_events (
  id                     uuid primary key default gen_random_uuid(),
  building_candidate_key text not null,
  building_id            uuid references buildings(id) on delete set null,
  threshold              int not null,
  request_count          int not null,
  notified_at            timestamptz,
  created_at             timestamptz not null default now()
);

create table if not exists promo_codes (
  id                         uuid primary key default gen_random_uuid(),
  code                       text not null unique,
  description                text,
  discount_kind              promo_discount_kind not null default 'free_first_wash',
  discount_percent           int,
  discount_amount_cents      int,
  applies_first_booking_only boolean not null default true,
  max_redemptions            int,
  redemption_count           int not null default 0,
  expires_at                 timestamptz,
  active                     boolean not null default true,
  stripe_coupon_id           text,
  created_at                 timestamptz not null default now()
);

create table if not exists promo_redemptions (
  id            uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references promo_codes(id) on delete cascade,
  profile_id    uuid references profiles(id) on delete set null,
  booking_id    uuid references bookings(id) on delete set null,
  redeemed_at   timestamptz not null default now()
);

create index if not exists promo_redemptions_code_idx on promo_redemptions (promo_code_id);

create table if not exists resident_saved_addresses (
  id                uuid primary key default gen_random_uuid(),
  resident_id       uuid not null references residents(id) on delete cascade,
  label             text,
  place_id          text,
  formatted_address text not null,
  lat               numeric(9,6),
  lng               numeric(9,6),
  is_primary        boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists resident_saved_addresses_resident_idx on resident_saved_addresses (resident_id);

create table if not exists referrals (
  id                    uuid primary key default gen_random_uuid(),
  referrer_profile_id   uuid not null references profiles(id) on delete cascade,
  referred_profile_id   uuid references profiles(id) on delete set null,
  role                  text not null default 'resident',
  code                  text not null unique,
  credit_cents_each     int not null default 1000,
  fulfilled_at          timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists referrals_code_idx on referrals (code);

create table if not exists gift_wash_credits (
  id                     uuid primary key default gen_random_uuid(),
  sender_profile_id      uuid not null references profiles(id) on delete cascade,
  recipient_email        text not null,
  recipient_phone        text,
  amount_cents           int not null,
  promo_code_id          uuid references promo_codes(id) on delete set null,
  redeemed_by_profile_id uuid references profiles(id) on delete set null,
  redeemed_at            timestamptz,
  created_at             timestamptz not null default now()
);

alter table operators
  add column if not exists application_status           text not null default 'draft',
  add column if not exists coi_insurer_name             text,
  add column if not exists coi_policy_number            text,
  add column if not exists coi_coverage_limits          text,
  add column if not exists coi_expires_at               date,
  add column if not exists coi_file_url                 text,
  add column if not exists coi_additional_insured_ok    boolean not null default false,
  add column if not exists background_check_status      text not null default 'pending',
  add column if not exists payout_reserve_percent       numeric(5,2) not null default 5;

alter table vehicles
  add column if not exists photo_url text;

alter table residents
  add column if not exists vehicle_access_method text,
  add column if not exists vehicle_access_notes  text;

alter table bookings
  add column if not exists recurring_cadence       text,
  add column if not exists cancellation_fee_cents  int,
  add column if not exists tip_cents               int,
  add column if not exists pre_wash_photo_urls     jsonb,
  add column if not exists post_wash_photo_urls    jsonb;

alter table issues
  add column if not exists category   text,
  add column if not exists photo_urls jsonb;

create table if not exists building_broadcasts (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  sent_by     uuid not null references profiles(id) on delete cascade,
  subject     text not null,
  body        text not null,
  channels    text[] not null default array['email']::text[],
  sent_at     timestamptz not null default now()
);

create table if not exists enterprise_leads (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  company        text not null,
  email          text not null,
  portfolio_size text,
  notes          text,
  created_at     timestamptz not null default now()
);

create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create unique index if not exists push_subscriptions_endpoint_uidx on push_subscriptions (endpoint);

-- Enable RLS (idempotent)
alter table building_requests                  enable row level security;
alter table building_waitlist                  enable row level security;
alter table building_share_links               enable row level security;
alter table homeowner_waitlist                 enable row level security;
alter table building_request_threshold_events  enable row level security;
alter table promo_codes                        enable row level security;
alter table promo_redemptions                  enable row level security;
alter table resident_saved_addresses           enable row level security;
alter table referrals                          enable row level security;
alter table gift_wash_credits                  enable row level security;
alter table building_broadcasts                enable row level security;
alter table enterprise_leads                   enable row level security;
alter table push_subscriptions                 enable row level security;

-- Policies (drop-then-create for idempotency)
drop policy if exists building_requests_admin on building_requests;
create policy building_requests_admin on building_requests
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists building_waitlist_admin on building_waitlist;
create policy building_waitlist_admin on building_waitlist
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists building_share_links_admin on building_share_links;
create policy building_share_links_admin on building_share_links
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists homeowner_waitlist_admin on homeowner_waitlist;
create policy homeowner_waitlist_admin on homeowner_waitlist
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists building_request_threshold_events_admin on building_request_threshold_events;
create policy building_request_threshold_events_admin on building_request_threshold_events
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists promo_codes_admin on promo_codes;
create policy promo_codes_admin on promo_codes
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists promo_redemptions_admin on promo_redemptions;
create policy promo_redemptions_admin on promo_redemptions
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists resident_saved_addresses_owner on resident_saved_addresses;
create policy resident_saved_addresses_owner on resident_saved_addresses
  for all using (
    exists (select 1 from residents r where r.id = resident_id and r.profile_id = auth.uid())
  );

drop policy if exists referrals_admin on referrals;
create policy referrals_admin on referrals
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists referrals_referrer_read on referrals;
create policy referrals_referrer_read on referrals
  for select using (referrer_profile_id = auth.uid());

drop policy if exists referrals_referrer_insert on referrals;
create policy referrals_referrer_insert on referrals
  for insert with check (referrer_profile_id = auth.uid());

drop policy if exists gift_wash_credits_admin on gift_wash_credits;
create policy gift_wash_credits_admin on gift_wash_credits
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists building_broadcasts_manager on building_broadcasts;
create policy building_broadcasts_manager on building_broadcasts
  for all using (
    exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
  );

drop policy if exists building_broadcasts_admin on building_broadcasts;
create policy building_broadcasts_admin on building_broadcasts
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists enterprise_leads_admin on enterprise_leads;
create policy enterprise_leads_admin on enterprise_leads
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists push_subscriptions_owner on push_subscriptions;
create policy push_subscriptions_owner on push_subscriptions
  for all using (profile_id = auth.uid());

drop policy if exists push_subscriptions_admin on push_subscriptions;
create policy push_subscriptions_admin on push_subscriptions
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

insert into promo_codes (code, description, discount_kind, applies_first_booking_only, max_redemptions, active)
values ('FIRSTWASH', 'First wash promo from check-building flow', 'free_first_wash', true, null, true)
on conflict (code) do nothing;


-- ─────────────────────────────────────────────────────────────
-- 0021: Operator SEO slug
-- ─────────────────────────────────────────────────────────────

alter table operators add column if not exists seo_slug text;
create unique index if not exists operators_seo_slug_uidx on operators (seo_slug) where seo_slug is not null;


-- ─────────────────────────────────────────────────────────────
-- 0022: Booking promo linkage, resident Stripe subscription,
--       operator go-live flag
-- ─────────────────────────────────────────────────────────────

alter table bookings
  add column if not exists promo_code_id       uuid references promo_codes(id) on delete set null,
  add column if not exists promo_discount_cents int not null default 0;

alter table residents
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_tier       text;

alter table operators
  add column if not exists live_ok              boolean not null default true,
  add column if not exists checkr_candidate_id  text;

create index if not exists bookings_promo_code_id_idx on bookings (promo_code_id)
  where promo_code_id is not null;


-- ─────────────────────────────────────────────────────────────
-- 0023: Contracts governing_law default
-- ─────────────────────────────────────────────────────────────

alter table contracts alter column governing_law set default 'Delaware';
