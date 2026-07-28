/**
 * Regression guard for the agreement's governing-law clause.
 * Run: npx tsx scripts/governing-law-test.ts
 *
 * A Hoboken, NJ building's agreement said "the laws of the State of Delaware"
 * (QA, July 2026): the operator's "Send agreement" path never set
 * governing_law, so the column default filled it in. The invariant is that the
 * clause names the state the building is actually in, whether the manager
 * typed a postal code ("NJ") or a full name ("new jersey") at onboarding.
 */

import { DEFAULT_GOVERNING_LAW, resolveGoverningLaw } from '../lib/governing-law';

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const CASES: [string | null | undefined, string | null | undefined, string][] = [
  // [region, stored governing_law, expected]
  ['NJ', 'Delaware', 'New Jersey'],
  ['nj', null, 'New Jersey'],
  ['New Jersey', 'Delaware', 'New Jersey'],
  ['new jersey', null, 'New Jersey'],
  ['  NY  ', 'Delaware', 'New York'],
  ['PA', null, 'Pennsylvania'],
  ['DE', null, 'Delaware'],
  // No region on file: keep whatever the row already says, then the default.
  [null, 'New York', 'New York'],
  ['', 'New York', 'New York'],
  [null, null, DEFAULT_GOVERNING_LAW],
  [undefined, undefined, DEFAULT_GOVERNING_LAW],
  // Unrecognized entries pass through rather than blanking the clause.
  ['Ontario', 'Delaware', 'Ontario'],
];

function main() {
  for (const [region, stored, expected] of CASES) {
    const got = resolveGoverningLaw(region, stored);
    if (got !== expected) {
      fail(`region=${JSON.stringify(region)} stored=${JSON.stringify(stored)} → ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
    }
  }

  // The specific bug: a New Jersey building must never be governed by Delaware.
  if (resolveGoverningLaw('NJ', 'Delaware') === 'Delaware') {
    fail('a NJ building still resolves to Delaware');
  }

  console.log(`PASS: ${CASES.length} governing-law cases`);
}

main();
