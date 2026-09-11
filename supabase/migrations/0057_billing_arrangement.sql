-- Who pays for a wash: the occupant, the property, or both.
--
-- Lavo shipped with one answer — the occupant — which is right for an
-- apartment building and wrong for a commercial one, where the buying
-- relationship is with the property and the wash is an amenity it funds.
-- The arrangement belongs on the agreement because that is what the two
-- parties actually signed.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'billing_mode') then
    create type billing_mode as enum ('occupant_pays', 'property_pays', 'property_subsidized');
  end if;
end $$;

alter table contracts
  add column if not exists billing_mode billing_mode not null default 'occupant_pays',
  add column if not exists property_subsidy_cents integer not null default 0;

comment on column contracts.billing_mode is
  'Who pays for a wash under this agreement. Defaults to occupant_pays, the original behaviour.';
comment on column contracts.property_subsidy_cents is
  'Per-wash amount the property covers under property_subsidized. Ignored in other modes.';

-- A subsidy is only meaningful when the property is covering part of a wash,
-- and it can never be negative.
alter table contracts
  drop constraint if exists contracts_subsidy_sane;
alter table contracts
  add constraint contracts_subsidy_sane check (
    property_subsidy_cents >= 0
    and (billing_mode = 'property_subsidized' or property_subsidy_cents = 0)
  );

-- The property's card on file. Nothing can be billed to a property without
-- one, so the columns live alongside the building they belong to.
alter table buildings
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_payment_method_id text;

comment on column buildings.stripe_payment_method_id is
  'Saved card used when the agreement bills the property. Required before property_pays or property_subsidized can be enabled.';

-- What the property owes on a given booking, and the charge that settled it.
-- Recorded on the booking so the ledger shows who actually paid for each wash,
-- and so a charge deferred until the occupant pays has somewhere to be found.
alter table bookings
  add column if not exists property_charge_cents integer not null default 0,
  add column if not exists property_payment_intent_id text;

comment on column bookings.property_charge_cents is
  'Share of this wash billed to the property. 0 when the occupant pays in full.';
comment on column bookings.property_payment_intent_id is
  'Stripe PaymentIntent for the property''s share, once charged.';
