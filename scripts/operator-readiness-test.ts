/**
 * Regression guard for the operator readiness gate.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/operator-readiness-test.ts
 *
 * Operator onboarding is fully automated: there is no manual approval step, so
 * the ONLY thing that may keep a signed-up operator from being requestable is a
 * gap in their own profile. The invariants below are the ones that broke in
 * production — an operator sitting at `pending_review` with a complete profile
 * was invisible and unbookable with nothing for them to do about it.
 */

import { operatorSetup, operatorRequirements, openWashDays } from '../lib/operator-readiness';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

const HOURS_OPEN = { Mon: { open: '09:00', close: '17:00' }, Sat: { closed: true } };
const HOURS_ALL_CLOSED = { Mon: { closed: true }, Tue: { closed: true } };

const COMPLETE = {
  status: 'approved',
  name: 'Two Hands Car Detailing',
  hours_json: HOURS_OPEN,
  base_price_cents: 7000,
  stripe_onboarding_complete: true,
  insurance_doc_url: 'operators/abc/cert.pdf',
  insurance_review_status: 'pending_review',
  insurance_expires_at: null,
};

function main() {
  // ── wash days ───────────────────────────────────────────────────────────
  check('an open day counts', openWashDays(HOURS_OPEN).length === 1);
  check('all-closed hours count as no wash days', openWashDays(HOURS_ALL_CLOSED).length === 0);
  check('missing hours count as no wash days', openWashDays(null).length === 0);

  // ── the core invariant: status must never gate a complete profile ───────
  const pendingButComplete = operatorSetup({ ...COMPLETE, status: 'pending_review' }, 1);
  check('a complete profile is requestable even at pending_review', pendingButComplete.requestable);
  check('a complete profile has nothing outstanding', pendingButComplete.pending.length === 0);

  const approvedComplete = operatorSetup(COMPLETE, 1);
  check('a complete approved profile is requestable', approvedComplete.requestable);

  // ── each requirement blocks on its own ──────────────────────────────────
  const gaps: [string, any, number][] = [
    ['business name', { ...COMPLETE, name: null }, 1],
    ['wash days & hours', { ...COMPLETE, hours_json: HOURS_ALL_CLOSED }, 1],
    ['base price per wash', { ...COMPLETE, base_price_cents: 0 }, 1],
    ['a service package', COMPLETE, 0],
    ['payment account', { ...COMPLETE, stripe_onboarding_complete: false }, 1],
    ['insurance certificate', { ...COMPLETE, insurance_doc_url: null }, 1],
  ];
  for (const [label, row, packages] of gaps) {
    const setup = operatorSetup(row, packages);
    check(`missing ${label} blocks the request`, !setup.requestable);
    check(`missing ${label} is named in pending`, setup.pending.includes(label));
    check(`missing ${label} is the only gap`, setup.pending.length === 1);
  }

  // ── an empty signup is visible but blocked on everything ────────────────
  const empty = operatorSetup({ status: 'pending_review' }, 0);
  check('an empty signup is not requestable', !empty.requestable);
  check('an empty signup lists all six requirements', empty.pending.length === 6);

  // ── admin decisions still hold ──────────────────────────────────────────
  for (const status of ['suspended', 'rejected']) {
    const setup = operatorSetup({ ...COMPLETE, status }, 1);
    check(`a ${status} operator is not requestable`, !setup.requestable);
    check(`a ${status} operator is flagged blocked`, setup.blocked);
  }

  // ── insurance review is surfaced, never blocking ────────────────────────
  const unapprovedCert = operatorSetup({ ...COMPLETE, insurance_review_status: 'pending_review' }, 1);
  check('an unreviewed certificate does not block the request', unapprovedCert.requestable);
  check('an unreviewed certificate is not reported as insured', !unapprovedCert.insured);

  const today = new Date().toISOString().slice(0, 10);
  const future = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
  const approvedCert = operatorSetup(
    { ...COMPLETE, insurance_review_status: 'approved', insurance_expires_at: future },
    1,
  );
  check('an approved unexpired certificate reads as insured', approvedCert.insured);

  const expiredCert = operatorSetup(
    { ...COMPLETE, insurance_review_status: 'approved', insurance_expires_at: '2020-01-01' },
    1,
  );
  check('an expired certificate does not read as insured', !expiredCert.insured);
  check('an expired certificate still does not block the request', expiredCert.requestable);

  // ── the agreement-send subset stays in sync ─────────────────────────────
  const docFields = operatorRequirements(COMPLETE, 1)
    .filter((r) => ['name', 'schedule', 'price', 'packages'].includes(r.key));
  check('the agreement needs exactly four document fields', docFields.length === 4);
  check('a complete profile satisfies all of them', docFields.every((r) => r.done));

  if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('PASS: operator readiness gate');
}

main();
