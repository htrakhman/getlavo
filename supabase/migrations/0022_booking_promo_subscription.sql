-- Booking promo linkage, resident Stripe subscription, operator go-live flag.

alter table bookings
  add column if not exists promo_code_id uuid references promo_codes(id) on delete set null,
  add column if not exists promo_discount_cents int not null default 0;

alter table residents
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_tier text;

alter table operators
  add column if not exists live_ok boolean not null default true,
  add column if not exists checkr_candidate_id text;

create index if not exists bookings_promo_code_id_idx on bookings (promo_code_id)
  where promo_code_id is not null;
