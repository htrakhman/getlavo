-- Add payout_reserve_percent used by the earnings page.
-- Also backfills the coi_* columns that the original compliance form relied on,
-- so that data can be stored if that flow is ever restored.
alter table operators
  add column if not exists payout_reserve_percent    numeric(5,2) not null default 5,
  add column if not exists coi_insurer_name          text,
  add column if not exists coi_policy_number         text,
  add column if not exists coi_coverage_limits       text,
  add column if not exists coi_expires_at            date,
  add column if not exists coi_additional_insured_ok boolean not null default false,
  add column if not exists coi_file_url              text;
