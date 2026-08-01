-- Payment processing is passed through to the operator, so the ledger needs a
-- third line. Until now a payment split two ways — fee_cents (Lavo) and
-- net_cents (operator) — and Stripe's 2.9% + 30¢ came silently out of Lavo's
-- side. Recording it keeps fee_cents meaning "Lavo's revenue" (what the admin
-- revenue figures sum) while net_cents means "what the operator receives", with
-- the difference explained rather than unaccounted for.
--
--   gross_cents = fee_cents + processing_fee_cents + net_cents

alter table public.bookings
  add column if not exists processing_fee_cents int not null default 0;

alter table public.charges
  add column if not exists processing_fee_cents int not null default 0;

comment on column public.bookings.processing_fee_cents is
  'Stripe processing cost passed through to the operator. Included in the Stripe application fee alongside fee_cents, and already deducted from net_cents.';

comment on column public.charges.processing_fee_cents is
  'Stripe processing cost passed through to the operator. Included in the Stripe application fee alongside fee_cents.';
