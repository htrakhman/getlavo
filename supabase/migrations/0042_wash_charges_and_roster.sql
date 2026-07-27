-- ============================================================
-- 0042: Close the core payment loop (QA July 2026, finding 1).
--
-- Nothing ever recorded "resident X was charged $Y for wash Z":
-- chargeWash() created a Stripe PaymentIntent and threw the result
-- away. Add a charges ledger written by the app on every attempt.
--
-- Also back the wash-day roster generator: washes rows are created
-- idempotently per (wash_day, resident), so give that pair a unique
-- index for conflict-free upserts.
-- ============================================================

create table if not exists charges (
  id                        uuid primary key default gen_random_uuid(),
  wash_id                   uuid unique references washes(id) on delete set null,
  resident_id               uuid not null references residents(id) on delete restrict,
  operator_id               uuid references operators(id) on delete set null,
  wash_day_id               uuid references wash_days(id) on delete set null,
  package_id                uuid references service_packages(id) on delete set null,
  amount_cents              int not null,
  fee_cents                 int not null default 0,
  currency                  text not null default 'usd',
  status                    text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  stripe_payment_intent_id  text,
  failure_reason            text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists charges_resident_idx on charges (resident_id, created_at desc);
create index if not exists charges_operator_idx on charges (operator_id, created_at desc);
create index if not exists charges_intent_idx   on charges (stripe_payment_intent_id);

create trigger t_charges_updated before update on charges
  for each row execute function set_updated_at();

alter table charges enable row level security;

-- Residents see their own charges; operators see charges destined to them.
-- All writes go through the service role (no insert/update policies).
drop policy if exists charges_resident_read on charges;
create policy charges_resident_read on charges
  for select using (
    exists (select 1 from residents r where r.id = resident_id and r.profile_id = auth.uid())
  );

drop policy if exists charges_operator_read on charges;
create policy charges_operator_read on charges
  for select using (
    exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
  );

drop policy if exists charges_admin_read on charges;
create policy charges_admin_read on charges
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- One roster row per resident per wash day, so roster syncs can upsert.
create unique index if not exists washes_wash_day_resident_uniq
  on washes (wash_day_id, resident_id);
