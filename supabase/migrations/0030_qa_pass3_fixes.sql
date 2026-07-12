-- QA Pass #3 targeted fixes — idempotent, safe to run on any env
-- Covers schema gaps exposed by BUG-9, BUG-10, and BUG-13.

-- BUG-9: vehicle access columns queried by /resident/vehicle page
alter table residents
  add column if not exists vehicle_access_method text,
  add column if not exists vehicle_access_notes  text;

-- BUG-10: referrals table referenced by /api/referrals/create
create table if not exists referrals (
  id                  uuid primary key default gen_random_uuid(),
  referrer_profile_id uuid not null references profiles(id) on delete cascade,
  referred_profile_id uuid references profiles(id) on delete set null,
  role                text not null default 'resident',
  code                text not null unique,
  credit_cents_each   int not null default 1000,
  fulfilled_at        timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists referrals_code_idx on referrals (code);
alter table referrals enable row level security;

drop policy if exists referrals_referrer_read on referrals;
create policy referrals_referrer_read on referrals
  for select using (referrer_profile_id = auth.uid());

drop policy if exists referrals_referrer_insert on referrals;
create policy referrals_referrer_insert on referrals
  for insert with check (referrer_profile_id = auth.uid());

drop policy if exists referrals_admin on referrals;
create policy referrals_admin on referrals
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- BUG-13: issues table missing category + photo_urls columns
alter table issues
  add column if not exists category   text,
  add column if not exists photo_urls jsonb;
