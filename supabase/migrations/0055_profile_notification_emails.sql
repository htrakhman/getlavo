-- ============================================================
-- 0055: Additional notification emails per profile.
--
-- Residents share a car with a partner, and building managers hand the
-- account to whoever is on duty — one address on the profile meant the
-- other person never saw the wash reminder or the "your car is done"
-- note. Extra addresses ride along on the same notifications the
-- primary email gets; they are copies, not logins, so they live on the
-- profile rather than becoming auth users.
--
-- The primary `email` stays the account identity: it is what the app
-- signs in with and what "Contact support to change your email" refers
-- to. Anything here is additive and is stripped of the primary address
-- before send so nobody gets two copies.
-- ============================================================

alter table public.profiles
  add column if not exists notification_emails text[] not null default '{}';

comment on column public.profiles.notification_emails is
  'Extra addresses copied on this profile''s notification emails. Lowercased, deduped, excludes the primary email, capped at 3 by the app (lib/notification-emails.ts). Not auth identities.';
