-- Track waitlist signup confirmation email (separate from operator-match activation email).

alter table building_waitlist
  add column if not exists waitlist_confirmation_sent_at timestamptz;
