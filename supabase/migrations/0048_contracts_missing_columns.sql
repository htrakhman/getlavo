-- Restore the contract columns the app writes but the live schema never got.
--
-- 0005_contracts_esign.sql was never applied to this project — the migration
-- history starts well after it — so `contracts` is missing five columns that
-- application code reads and writes. Every one of them fails closed, and
-- together they break the entire agreement flow end to end:
--
--   * price_per_wash_cents / service_day — both contract-creation paths insert
--     these. The operator's "Send agreement" button returns 500 "Failed to
--     create agreement". The building page's auto-create fails too, and so does
--     its minimal-shape retry, since that also carries price_per_wash_cents —
--     so the manager never gets a contract row to sign either.
--   * fully_executed_at — the sign route sets it when the second party signs,
--     so the final signature 500s and no agreement can ever reach 'executed'.
--   * cancelled_at / cancellation_reason — the reject route writes them (it has
--     a status-only fallback, so declining works but loses the reason).
--
-- The operator contracts list names fully_executed_at in its select, and
-- PostgREST rejects the whole query over one unknown column, so that page
-- rendered as "no contracts" regardless of what was in the table.
--
-- Kept nullable and additive: existing rows stay valid, and 0005's other
-- objects (contract_parties, signatures, documents) are deliberately not
-- recreated here — nothing in the current code path uses them.

alter table contracts add column if not exists price_per_wash_cents int;
alter table contracts add column if not exists service_day text;
alter table contracts add column if not exists fully_executed_at timestamptz;
alter table contracts add column if not exists cancelled_at timestamptz;
alter table contracts add column if not exists cancellation_reason text;

-- Contracts signed by both parties before this fix never got their execution
-- timestamp, and the UI falls back to a signature date when it's absent.
-- Stamp the later of the two signatures so the record is accurate.
update contracts
   set fully_executed_at = greatest(manager_signed_at, operator_signed_at)
 where fully_executed_at is null
   and manager_signed_at is not null
   and operator_signed_at is not null;
