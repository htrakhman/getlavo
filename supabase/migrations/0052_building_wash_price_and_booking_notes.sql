-- ============================================================
-- 0052: A booking carried no free-text from the resident, so anything the crew
-- needed to know that wasn't already on the resident or vehicle record had
-- nowhere to live. The booking email and the calendar invite both read it.
--
-- (Per-building wash pricing is resolved from the building's executed
-- agreement instead — see lib/wash-pricing.ts and migration 0048's
-- contracts.price_per_wash_cents.)
-- ============================================================

alter table bookings
  add column if not exists resident_notes text;
