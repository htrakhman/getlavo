-- ============================================================
-- 0032: Store the Stripe Checkout session id on bookings.
--
-- Checkout (API 2024-06-20) does not create a PaymentIntent until the
-- customer confirms payment, so bookings previously had no reference back
-- to their Stripe payment at all. The session id lets the app verify
-- payment on the success redirect even when the webhook is missed.
-- ============================================================

alter table bookings add column if not exists stripe_checkout_session_id text;

create index if not exists bookings_stripe_checkout_session_idx
  on bookings (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
