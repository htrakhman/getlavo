-- Wash day proposal/confirmation flow.
-- Operator proposes a date; building manager confirms or counters.

alter table wash_days add column if not exists proposed_for     date;
alter table wash_days add column if not exists proposed_by      uuid references profiles(id) on delete set null;
alter table wash_days add column if not exists confirmation     text not null default 'auto'
  check (confirmation in ('auto', 'pending', 'confirmed', 'declined'));
