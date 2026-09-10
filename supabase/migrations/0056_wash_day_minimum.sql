-- Minimum bookings per wash day.
--
-- An operator should not have to drive to a property for one car. This lets
-- each operator set the number of bookings a wash day must reach, and gives a
-- wash day somewhere to record that it was called off for missing it.

alter table operators
  add column if not exists min_bookings_per_day smallint not null default 0;

comment on column operators.min_bookings_per_day is
  'Bookings a wash day must reach by the cutoff or it is cancelled. 0 disables the rule.';

alter table wash_days
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text;

comment on column wash_days.cancelled_at is
  'Set when the day was called off. A cancelled day is never served and never re-opened.';

-- The sweeper scans upcoming, not-yet-cancelled days; this keeps that cheap
-- as wash_days grows.
create index if not exists wash_days_open_upcoming_idx
  on wash_days (scheduled_for)
  where cancelled_at is null and completed_at is null;
