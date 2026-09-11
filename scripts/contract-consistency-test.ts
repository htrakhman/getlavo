/**
 * The agreement must read the same in every place it is rendered, and must not
 * assume the property is residential.
 * Run: npx tsx scripts/contract-consistency-test.ts
 *
 * There are four renderings of the same contract: the PDF that gets emailed
 * and signed, the manager's view, the operator's view of a sent agreement, and
 * the operator's preview before sending. They drifted badly — at one point the
 * operator's copy still promised a 90-day pilot and a fixed weekly schedule
 * while the manager's copy said month-to-month with no fixed cadence, and the
 * preview described terms that were never in the document at all. One
 * agreement cannot describe different deals depending on who opens it.
 *
 * Assertions run against whitespace-normalized source, because the prose is
 * wrapped differently in each file — JSX across several lines, template
 * literals on one. Matching per-line would pass or fail on formatting rather
 * than on what the document says.
 */
import assert from 'node:assert';
import fs from 'node:fs';

const RENDERINGS = [
  'lib/contract-pdf.ts',
  'app/(building)/building/contract/page.tsx',
  'app/(operator)/operator/contracts/[id]/page.tsx',
  'app/(operator)/operator/contracts/AgreementBuilder.tsx',
];

/** Collapse whitespace and JSX entities so prose matches regardless of wrapping. */
function normalize(text: string): string {
  return text
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&rsquo;/g, "'")
    .replace(/\{'\s*'\}/g, ' ')
    .replace(/\s+/g, ' ');
}

const sources = RENDERINGS.map((path) => ({
  path,
  flat: normalize(fs.readFileSync(path, 'utf8')),
}));

/** Phrases that must appear in every rendering. */
const MUST_CONTAIN: [RegExp, string][] = [
  [/Property Manager/, 'does not name the Property Manager party'],
  [/month-to-month/i, 'does not state the month-to-month term'],
  [
    /residents and tenants of the Property/,
    'does not define "Occupants" to cover both residential and commercial tenants',
  ],
  [/residential or commercial/, 'does not define "Property" as residential or commercial'],
];

/** Language that assumes a residential building, or terms since removed. */
const MUST_NOT_CONTAIN: [RegExp, string][] = [
  [/Building Manager/, 'calls the party "Building Manager" — a commercial landlord is not a building manager'],
  [/\bapartments?\b/i, 'assumes apartments'],
  [/parking garage/i, 'assumes a parking garage rather than any designated parking area'],
  [/pilot period/i, 'still promises a pilot period — the agreement is month-to-month with no minimum term'],
  [/\b(90|ninety)[)\s]*days?\b/i, 'still names a 90-day term'],
  [/Weekly \(or as agreed/i, 'still promises a weekly cadence — the agreement commits to no fixed cadence'],
  [/Scheduled wash day:/, 'still names a fixed wash day — dates are scheduled through the platform'],
];

for (const { path, flat } of sources) {
  for (const [pattern, why] of MUST_CONTAIN) {
    assert.ok(pattern.test(flat), `${path} ${why}`);
  }
  for (const [pattern, why] of MUST_NOT_CONTAIN) {
    const hit = flat.match(pattern);
    assert.equal(hit, null, `${path} ${why}\n  found: ${hit?.[0]}`);
  }
}

// "Resident" alone excludes a commercial tenant. It is allowed only inside the
// Occupants definition, which deliberately names residents AND tenants.
for (const { path, flat } of sources) {
  const withoutDefinition = flat
    .replace(/residents and tenants of the Property/g, '')
    .replace(/residential or commercial/g, '');
  const hit = withoutDefinition.match(/\bresidents?\b/i);
  assert.equal(
    hit,
    null,
    `${path} still calls Occupants "residents", which excludes a commercial tenant\n  found: ${hit?.[0]}`,
  );
}

console.log(`contract consistency: all assertions passed across ${RENDERINGS.length} renderings`);
