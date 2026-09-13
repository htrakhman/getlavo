/**
 * The operator must be told, above the fold and in the nav, when a property
 * has signed and they have not.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/operator-signature-visibility-test.ts
 *
 * What went wrong: /operator/contracts renders AgreementBuilder first, which is
 * a complete live copy of the service agreement. The contract rows — correctly
 * badged "Needs your signature" — sat underneath it, so reaching them meant
 * scrolling past an entire legal document. The first thing on the page instead
 * read "Your agreement is ready to send ✓", which is a different task and reads
 * like nothing is outstanding. The operator sidebar only ever dotted Profile
 * and Compliance, so the nav said nothing either.
 *
 * Three properties had countersigned and were waiting; the operator had no way
 * to know. Zero operator signatures have ever completed on this platform.
 *
 * These assertions are structural, on source order, so the banner cannot drift
 * back below the builder and the dot cannot quietly stop being wired.
 */
import assert from 'node:assert';
import fs from 'node:fs';

const PAGE = 'app/(operator)/operator/contracts/page.tsx';
const LAYOUT = 'app/(operator)/operator/layout.tsx';
const HELPER = 'lib/operator-signatures.ts';

const page = fs.readFileSync(PAGE, 'utf8');
const layout = fs.readFileSync(LAYOUT, 'utf8');
const helper = fs.readFileSync(HELPER, 'utf8');

// --- The banner exists and is ABOVE the agreement builder ----------------
const bannerAt = page.indexOf('<AwaitingSignatureBanner');
const builderAt = page.indexOf('<AgreementBuilder');
assert.notEqual(bannerAt, -1, `${PAGE} does not render <AwaitingSignatureBanner>`);
assert.notEqual(builderAt, -1, `${PAGE} no longer renders <AgreementBuilder> — check this test`);
assert.ok(
  bannerAt < builderAt,
  `${PAGE} renders the signature banner AFTER <AgreementBuilder>. The builder prints a full copy ` +
    'of the agreement, so anything below it is past a wall of legal text — which is the bug.',
);

// --- The nav dot is wired to the same condition --------------------------
assert.ok(
  /getContractsAwaitingOperator/.test(layout),
  `${LAYOUT} does not read getContractsAwaitingOperator, so the Contracts nav item never gets a dot`,
);
assert.ok(
  /alerts\.push\('\/operator\/contracts'\)/.test(layout),
  `${LAYOUT} never pushes '/operator/contracts' onto alerts — an agreement awaiting the operator ` +
    'raises no dot in the sidebar',
);

// --- Page and nav must read the SAME query -------------------------------
// Two sources of truth is exactly how the building portal ended up with a dot
// in the nav and an unmarked page.
assert.ok(
  /getContractsAwaitingOperator/.test(page),
  `${PAGE} computes its banner from something other than getContractsAwaitingOperator — the dot ` +
    'and the page can then disagree',
);

// --- The query means "they signed, you did not" --------------------------
assert.ok(
  /\.is\('operator_signed_at', null\)/.test(helper),
  `${HELPER} does not filter to contracts the operator has NOT signed`,
);
assert.ok(
  /\.not\('manager_signed_at', 'is', null\)/.test(helper),
  `${HELPER} does not require the manager to have signed — an untouched offer would be reported ` +
    'as awaiting the operator, making a fresh send look like a countersigned agreement',
);
assert.ok(
  /\.eq\('status', 'pending_signatures'\)/.test(helper),
  `${HELPER} does not restrict to open agreements`,
);

// --- The signature box must be reachable without hunting for it ---------
// The agreement runs several screens; the place you sign is at the bottom of
// it. Both signing surfaces need an in-page anchor and a bar that jumps to it,
// or the one action the page exists for is the one thing never on screen.
{
  const SIGNING_PAGES: [string, string][] = [
    ['app/(operator)/operator/contracts/[id]/page.tsx', "the operator's copy"],
    ['app/(building)/building/contract/page.tsx', "the manager's copy"],
  ];
  for (const [file, who] of SIGNING_PAGES) {
    const body = fs.readFileSync(file, 'utf8');
    assert.ok(
      /id="sign"/.test(body),
      `${file} (${who}) has no id="sign" anchor, so nothing can link to the signature box`,
    );
    assert.ok(
      /<StickySignBar\b|<NextAgreementBar\b/.test(body),
      `${file} (${who}) renders no jump-to-signature bar — the signature box sits several screens ` +
        'down and the reader has to find it',
    );
  }

  // Both bars must render the SAME component, or the two portals drift into
  // looking like different products mid-signature.
  const shared = fs.readFileSync('components/StickySignBar.tsx', 'utf8');
  assert.ok(/export function StickySignBar/.test(shared), 'components/StickySignBar.tsx lost its export');
  const buildingBar = fs.readFileSync('app/(building)/building/contract/NextAgreementBar.tsx', 'utf8');
  assert.ok(
    /<StickySignBar\b/.test(buildingBar),
    'NextAgreementBar no longer renders the shared StickySignBar — the two portals can now diverge',
  );
}

console.log('operator signature visibility: all assertions passed');
