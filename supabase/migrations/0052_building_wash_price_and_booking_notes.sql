-- ============================================================
-- 0052: Two gaps the resident booking flow exposed.
--
-- 1. There was no "standard wash price for this building". The resident-facing
--    rate fell back to operators.base_price_cents, which PackagesEditor
--    auto-sets to min(active package prices) — so the standard wash was
--    quoted at the cheapest package's price, which is not a price anyone
--    chose. Give the partnership an explicit rate the operator sets per
--    building; null keeps the old fallback.
--
-- 2. A booking carried no free-text from the resident, so anything the crew
--    needed to know that wasn't already on the resident/vehicle record had
--    nowhere to live.
-- ============================================================

alter table partnerships
  add column if not exists standard_wash_price_cents int;

alter table bookings
  add column if not exists resident_notes text;
