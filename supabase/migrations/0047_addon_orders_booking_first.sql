-- ============================================================
-- 0047: Make add-ons orderable at checkout, and recorded when they are
-- (QA July 2026 — "no add-on selection step anywhere in the resident
-- booking/checkout flow").
--
-- Two things were broken behind that observation:
--   * Nothing in the app ever inserted an addon_orders row. "Add to next
--     wash only" opened a real Stripe checkout and recorded nothing, so
--     the resident paid and the crew never saw the add-on.
--   * addon_orders.wash_id was NOT NULL, so an add-on could only exist
--     once a wash row did — but residents choose add-ons at booking time,
--     before the wash day roster is built (and on-demand bookings never
--     get a wash row at all).
--
-- An add-on order now starts life attached to a booking and picks up its
-- wash_id later, when the paid booking joins the wash-day roster.
-- ============================================================

alter table addon_orders alter column wash_id drop not null;

-- Every add-on order must hang off something we can bill and show.
alter table addon_orders drop constraint if exists addon_orders_target_check;
alter table addon_orders add constraint addon_orders_target_check
  check (wash_id is not null or booking_id is not null);

create index if not exists addon_orders_booking_idx on addon_orders (booking_id);
create index if not exists addon_orders_wash_idx on addon_orders (wash_id);

-- The crew tool reads add-ons through washes, and the resident's own list
-- reads them through bookings, so both sides need the join to be cheap.

-- ============================================================
-- Backfill: agreements created by the operator's "Send agreement" flow
-- never set governing_law, so the column default ("Delaware") stood in
-- for the building's actual state. Point existing rows at the building.
-- ============================================================
update contracts c
set governing_law = b.region
from buildings b
where c.building_id = b.id
  and b.region is not null
  and btrim(b.region) <> ''
  and c.governing_law = 'Delaware'
  and upper(btrim(b.region)) not in ('DE', 'DELAWARE');
