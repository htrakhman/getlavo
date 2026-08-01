/**
 * Regression guard for the certificate auto-verify hold.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/insurance-auto-verify-test.ts
 *
 * Certificate review clears itself: an upload sits at `pending_review` for
 * INSURANCE_REVIEW_HOLD_MINUTES and then reads as verified with nobody opening
 * it. The invariants that matter are the ones the clock must never override —
 * an expired policy, an admin rejection, a missing certificate.
 */

import {
  INSURANCE_REVIEW_HOLD_MINUTES,
  autoVerifyDue,
  hasApprovedInsurance,
} from '../lib/insurance';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

const NOW = Date.parse('2026-06-01T12:00:00.000Z');
const HOLD_MS = INSURANCE_REVIEW_HOLD_MINUTES * 60_000;
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const PENDING = {
  insurance_review_status: 'pending_review',
  insurance_doc_url: 'operators/abc/cert.pdf',
  insurance_uploaded_at: ago(HOLD_MS + 1000),
  insurance_expires_at: '2099-01-01',
};

function main() {
  // ── the hold ────────────────────────────────────────────────────────────
  check('a certificate past the hold is due', autoVerifyDue(PENDING, NOW));
  check(
    'a certificate inside the hold is not due',
    !autoVerifyDue({ ...PENDING, insurance_uploaded_at: ago(HOLD_MS - 1000) }, NOW),
  );
  check(
    'a certificate uploaded this second is not due',
    !autoVerifyDue({ ...PENDING, insurance_uploaded_at: ago(0) }, NOW),
  );
  check('the hold is a few minutes, not hours', INSURANCE_REVIEW_HOLD_MINUTES > 0 && INSURANCE_REVIEW_HOLD_MINUTES <= 15);

  // ── what the clock must never override ──────────────────────────────────
  check(
    'an admin rejection is never undone by the clock',
    !autoVerifyDue({ ...PENDING, insurance_review_status: 'rejected' }, NOW),
  );
  check(
    'an expired review status is never undone by the clock',
    !autoVerifyDue({ ...PENDING, insurance_review_status: 'expired' }, NOW),
  );
  check(
    'a lapsed policy never auto-verifies',
    !autoVerifyDue({ ...PENDING, insurance_expires_at: '2020-01-01' }, NOW),
  );
  check(
    'a policy with no expiry date never auto-verifies',
    !autoVerifyDue({ ...PENDING, insurance_expires_at: null }, NOW),
  );
  check(
    'nothing auto-verifies without a certificate on file',
    !autoVerifyDue({ ...PENDING, insurance_doc_url: null }, NOW),
  );
  check(
    'nothing auto-verifies without an upload timestamp',
    !autoVerifyDue({ ...PENDING, insurance_uploaded_at: null }, NOW),
  );
  check(
    'a garbage upload timestamp does not auto-verify',
    !autoVerifyDue({ ...PENDING, insurance_uploaded_at: 'not a date' }, NOW),
  );
  check('a missing row is not due', !autoVerifyDue(null, NOW) && !autoVerifyDue(undefined, NOW));

  // ── readers agree before the flip is written ────────────────────────────
  check('a due certificate reads as insured before the sweep persists it', hasApprovedInsurance(PENDING));
  check(
    'a certificate still inside the hold does not read as insured',
    !hasApprovedInsurance({ ...PENDING, insurance_uploaded_at: new Date().toISOString() }),
  );
  check(
    'an approved unexpired certificate still reads as insured',
    hasApprovedInsurance({ ...PENDING, insurance_review_status: 'approved' }),
  );
  check(
    'an approved but expired certificate does not read as insured',
    !hasApprovedInsurance({ insurance_review_status: 'approved', insurance_expires_at: '2020-01-01' }),
  );
  check('a missing operator is not insured', !hasApprovedInsurance(null));

  if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('PASS: insurance auto-verify hold');
}

main();
