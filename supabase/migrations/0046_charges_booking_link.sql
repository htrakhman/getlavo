-- ============================================================
-- 0046: Make charges the single source of truth for wash payment
-- (QA July 2026 — "wash completion is disconnected from payment").
--
-- chargeWash() treated *any* booking row on the wash day as proof of
-- payment and returned without writing anything, so completing a wash
-- could leave the ledger empty while the resident page read "paid"
-- straight off the bookings row. Every completed wash now gets a
-- charges row, including the ones a prepaid booking covers — link the
-- two so the resident/operator/admin pages can dedupe instead of
-- reading two disagreeing tables.
-- ============================================================

alter table charges
  add column if not exists booking_id uuid references bookings(id) on delete set null;

-- A booking pays for at most one wash, so at most one charge may point at it.
create unique index if not exists charges_booking_uniq
  on charges (booking_id) where booking_id is not null;
