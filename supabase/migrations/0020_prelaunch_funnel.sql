-- Pre-launch funnel: building requests, waitlists, share links, promos, place matching.

alter table buildings
  add column if not exists google_place_id text;

create unique index if not exists buildings_google_place_id_uidx
  on buildings (google_place_id)
  where google_place_id is not null;

create type building_request_source as enum ('organic', 'ad', 'referral');

create type building_request_channel as enum (
  'check_flow',
  'email_mgmt',
  'neighbor_share',
  'waitlist_join',
  'homeowner_waitlist',
  'plus_one'
);

create table building_requests (
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
  utm_campaign           text
);

create index building_requests_candidate_idx on building_requests (building_candidate_key, requested_at desc);
create index building_requests_building_idx on building_requests (building_id, requested_at desc);

create table building_waitlist (
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

create index building_waitlist_candidate_idx on building_waitlist (building_candidate_key);
create index building_waitlist_building_idx on building_waitlist (building_id);

create table building_share_links (
  id                   uuid primary key default gen_random_uuid(),
  token                text not null unique,
  building_id          uuid references buildings(id) on delete set null,
  building_candidate_key text not null,
  created_by_request_id uuid references building_requests(id) on delete set null,
  click_count          int not null default 0,
  created_at           timestamptz not null default now()
);

create index building_share_links_token_idx on building_share_links (token);

create table homeowner_waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  partner_slug  text,
  place_id      text,
  created_at    timestamptz not null default now()
);

create table building_request_threshold_events (
  id                     uuid primary key default gen_random_uuid(),
  building_candidate_key text not null,
  building_id            uuid references buildings(id) on delete set null,
  threshold              int not null,
  request_count          int not null,
  notified_at            timestamptz,
  created_at             timestamptz not null default now()
);

create type promo_discount_kind as enum ('percent', 'fixed_cents', 'free_first_wash', 'free_upgrade');

create table promo_codes (
  id                       uuid primary key default gen_random_uuid(),
  code                     text not null unique,
  description              text,
  discount_kind            promo_discount_kind not null default 'free_first_wash',
  discount_percent         int,
  discount_amount_cents    int,
  applies_first_booking_only boolean not null default true,
  max_redemptions          int,
  redemption_count         int not null default 0,
  expires_at               timestamptz,
  active                   boolean not null default true,
  stripe_coupon_id         text,
  created_at               timestamptz not null default now()
);

create table promo_redemptions (
  id             uuid primary key default gen_random_uuid(),
  promo_code_id  uuid not null references promo_codes(id) on delete cascade,
  profile_id     uuid references profiles(id) on delete set null,
  booking_id     uuid references bookings(id) on delete set null,
  redeemed_at    timestamptz not null default now()
);

create index promo_redemptions_code_idx on promo_redemptions (promo_code_id);

-- Saved addresses, referrals, gifts (resident week-2 foundations)
create table resident_saved_addresses (
  id            uuid primary key default gen_random_uuid(),
  resident_id   uuid not null references residents(id) on delete cascade,
  label         text,
  place_id      text,
  formatted_address text not null,
  lat           numeric(9,6),
  lng           numeric(9,6),
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index resident_saved_addresses_resident_idx on resident_saved_addresses (resident_id);

create table referrals (
  id                uuid primary key default gen_random_uuid(),
  referrer_profile_id uuid not null references profiles(id) on delete cascade,
  referred_profile_id   uuid references profiles(id) on delete set null,
  role              text not null default 'resident',
  code              text not null unique,
  credit_cents_each int not null default 1000,
  fulfilled_at      timestamptz,
  created_at        timestamptz not null default now()
);

create index referrals_code_idx on referrals (code);

create table gift_wash_credits (
  id             uuid primary key default gen_random_uuid(),
  sender_profile_id uuid not null references profiles(id) on delete cascade,
  recipient_email text not null,
  recipient_phone text,
  amount_cents   int not null,
  promo_code_id  uuid references promo_codes(id) on delete set null,
  redeemed_by_profile_id uuid references profiles(id) on delete set null,
  redeemed_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- Operator application / COI (week-3 foundations)
alter table operators
  add column if not exists application_status text not null default 'draft',
  add column if not exists coi_insurer_name text,
  add column if not exists coi_policy_number text,
  add column if not exists coi_coverage_limits text,
  add column if not exists coi_expires_at date,
  add column if not exists coi_file_url text,
  add column if not exists coi_additional_insured_ok boolean not null default false,
  add column if not exists background_check_status text not null default 'pending',
  add column if not exists payout_reserve_percent numeric(5,2) not null default 5;

-- Resident vehicle / booking extensions
alter table vehicles
  add column if not exists photo_url text;

alter table residents
  add column if not exists vehicle_access_method text,
  add column if not exists vehicle_access_notes text;

alter table bookings
  add column if not exists recurring_cadence text,
  add column if not exists cancellation_fee_cents int,
  add column if not exists tip_cents int,
  add column if not exists pre_wash_photo_urls jsonb,
  add column if not exists post_wash_photo_urls jsonb;

alter table issues
  add column if not exists category text,
  add column if not exists photo_urls jsonb;

-- Building broadcast + enterprise leads
create table building_broadcasts (
  id           uuid primary key default gen_random_uuid(),
  building_id  uuid not null references buildings(id) on delete cascade,
  sent_by      uuid not null references profiles(id) on delete cascade,
  subject      text not null,
  body         text not null,
  channels     text[] not null default array['email']::text[],
  sent_at      timestamptz not null default now()
);

create table enterprise_leads (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  company        text not null,
  email          text not null,
  portfolio_size text,
  notes          text,
  created_at     timestamptz not null default now()
);

-- Web push subscriptions
create table push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  endpoint     text not null,
  p256dh       text not null,
  auth         text not null,
  user_agent     text,
  created_at   timestamptz not null default now()
);

create unique index push_subscriptions_endpoint_uidx on push_subscriptions (endpoint);

-- RLS: funnel tables are written via service role; admins may read.
alter table building_requests enable row level security;
alter table building_waitlist enable row level security;
alter table building_share_links enable row level security;
alter table homeowner_waitlist enable row level security;
alter table building_request_threshold_events enable row level security;
alter table promo_codes enable row level security;
alter table promo_redemptions enable row level security;
alter table resident_saved_addresses enable row level security;
alter table referrals enable row level security;
alter table gift_wash_credits enable row level security;
alter table building_broadcasts enable row level security;
alter table enterprise_leads enable row level security;
alter table push_subscriptions enable row level security;

create policy building_requests_admin on building_requests
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy building_waitlist_admin on building_waitlist
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy building_share_links_admin on building_share_links
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy homeowner_waitlist_admin on homeowner_waitlist
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy building_request_threshold_events_admin on building_request_threshold_events
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy promo_codes_admin on promo_codes
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy promo_redemptions_admin on promo_redemptions
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy resident_saved_addresses_owner on resident_saved_addresses
  for all using (
    exists (select 1 from residents r where r.id = resident_id and r.profile_id = auth.uid())
  );

create policy referrals_admin on referrals for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Referrer can read own referral rows
create policy referrals_referrer_read on referrals
  for select using (referrer_profile_id = auth.uid());

create policy referrals_referrer_insert on referrals
  for insert with check (referrer_profile_id = auth.uid());

create policy gift_wash_credits_admin on gift_wash_credits
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy building_broadcasts_manager on building_broadcasts
  for all using (
    exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
  );

create policy building_broadcasts_admin on building_broadcasts
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy enterprise_leads_admin on enterprise_leads
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy push_subscriptions_owner on push_subscriptions
  for all using (profile_id = auth.uid());

create policy push_subscriptions_admin on push_subscriptions
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Seed default first-wash promo (adjust code in production)
insert into promo_codes (code, description, discount_kind, applies_first_booking_only, max_redemptions, active)
values ('FIRSTWASH', 'First wash promo from check-building flow', 'free_first_wash', true, null, true)
on conflict (code) do nothing;
