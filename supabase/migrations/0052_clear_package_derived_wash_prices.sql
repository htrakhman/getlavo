-- Clear standard wash prices that were copied off a service package.
--
-- Until migration-era Aug 2026 the packages editor wrote
-- `operators.base_price_cents = min(active package price)` on every save, so a
-- cheap menu item became the operator's standard wash. One operator's $1.00
-- "Test Detail" package left "Standard wash — $1.00" on the resident booking
-- form while their real menu started at $70. The code path is gone (the rate is
-- stated on the operator's profile now, see lib/wash-pricing.ts), but the
-- copied values are still on the rows and are what residents see.
--
-- The repair is deliberately narrow. A row only qualifies when its base price
-- is *exactly* the cheapest active package price — the signature of the old
-- derivation — and is under $15, which is below any real mobile wash and so
-- cannot be a rate an operator meant to charge. An operator whose stated rate
-- happens to match their cheapest package at a plausible price is left alone;
-- there is no way to tell that apart from a deliberate choice.
--
-- Cleared rather than guessed at: the original number isn't recoverable, and a
-- null reads correctly everywhere — the operator sees the standard wash flagged
-- as an unfilled required field on their profile, the booking form offers their
-- packages without a standard wash, and the booking API refuses to ring one up.
-- Signed agreements are untouched: contracts carry their own
-- price_per_wash_cents and keep pricing the buildings that signed them.

-- `base_price_cents` has been not-null since 0001, but "no rate stated" is a
-- real state the app already writes and reads: the agreement builder sends null
-- when the price field is blank (and errors out today), every reader coalesces
-- to 0, and the public pricing queries filter on `is not null`. Only the
-- constraint disagreed.
alter table public.operators alter column base_price_cents drop not null;

with derived as (
  select o.id,
         (
           select min(sp.price_cents)
           from public.service_packages sp
           where sp.operator_id = o.id and sp.active
         ) as cheapest_package_cents
  from public.operators o
)
update public.operators o
   set base_price_cents = null,
       -- Onboarding seeded the on-demand rate as 1.3x the base, so it carries
       -- the same bad number. A rate derived from a cleared price is no more
       -- real than the price it came from.
       open_slot_price_cents = null
  from derived d
 where d.id = o.id
   and o.base_price_cents is not null
   and o.base_price_cents = d.cheapest_package_cents
   and o.base_price_cents < 1500;
