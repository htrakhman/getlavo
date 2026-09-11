/**
 * The agreement must say the same thing everywhere it is rendered, must not
 * assume the property is residential, and must keep the protections Lavo
 * relies on.
 * Run: npx tsx scripts/contract-consistency-test.ts
 *
 * The contract is rendered in four files: the PDF that is emailed and signed,
 * the manager's view, the operator's view of a sent agreement, and the
 * operator's preview before sending. They drifted far enough apart that the
 * two parties were once looking at different terms — one copy promised a
 * 90-day pilot and a weekly schedule the other had dropped.
 *
 * The legal prose now lives in lib/contract-terms.ts and every rendering
 * prints it, so the substance is asserted once, against that module. What is
 * asserted per rendering is that it actually uses the shared clauses rather
 * than hand-rolling its own copy, and that no residential assumption or
 * removed term has crept back into the surrounding text.
 *
 * NOT LEGAL ADVICE. These assertions check that clauses are present and
 * consistent, not that they are enforceable in any given state.
 */
import assert from 'node:assert';
import fs from 'node:fs';

const TERMS = 'lib/contract-terms.ts';
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
    .replace(/&rsquo;/g, '’')
    .replace(/\{'\s*'\}/g, ' ')
    .replace(/\s+/g, ' ');
}

const read = (p: string) => ({ path: p, flat: normalize(fs.readFileSync(p, 'utf8')) });
const terms = read(TERMS);
const sources = RENDERINGS.map(read);
const everything = [terms, ...sources];

// --- 1. The protections Lavo relies on, asserted once at the source -------
const LAVO_PROTECTIONS: [RegExp, string][] = [
  [/express third-party beneficiary/i, 'missing the third-party beneficiary clause — Lavo signs nothing, so without it Lavo cannot enforce terms written for its benefit'],
  [/independent contractor/i, 'does not state that the operator is an independent contractor'],
  [/solely responsible for the Services/i, 'does not put sole responsibility for the Services on the operator'],
  [/defend, indemnify and hold harmless Lavo/i, 'missing the indemnity running to Lavo'],
  [/garagekeepers legal liability/i, "does not require garagekeepers cover — a standard CGL policy excludes damage to vehicles in the operator's care"],
  [/additional insured/i, 'does not require Lavo to be named as an additional insured'],
  [/waive rights of subrogation/i, 'does not require a waiver of subrogation'],
  [/survives termination/i, 'does not say the indemnity survives termination'],
  // Keep the subject pinned to Lavo: the operator's cap sentence also says
  // "not liable", and matching that instead would pass while Lavo's own
  // disclaimer had been deleted. [^.] holds the match inside one sentence.
  [/Lavo is not liable\b[^.]{0,200}?for loss of or damage to any vehicle/i, 'does not disclaim Lavo liability for vehicle damage'],
  [/Lavo is not liable\b[^.]{0,400}?for personal injury or death/i, 'does not disclaim Lavo liability for injury or death'],
  [/claim arising out of the Services is to be made against Service Provider/i, 'does not direct claims to the operator'],
];
for (const [pattern, why] of LAVO_PROTECTIONS) {
  assert.ok(pattern.test(terms.flat), `${TERMS} ${why}`);
}

// The operator's cap must never again be written broadly enough to swallow
// vehicle damage: capping the operator at the price of one wash sends a
// damaged-car claim looking for a deeper pocket — the property and Lavo.
assert.ok(
  !/liability for any single incident is limited to the retail value/i.test(terms.flat),
  `${TERMS} caps the operator's liability for ANY incident at the price of a wash`,
);
assert.ok(
  /does not apply to, and does not reduce, Service Provider’s responsibility for loss of or damage to a vehicle/i.test(terms.flat),
  `${TERMS} does not carve vehicle damage out of the operator's liability cap`,
);

// --- 2. Every rendering must use the shared clauses ----------------------
for (const { path, flat } of sources) {
  assert.ok(
    /LIABILITY_CLAUSES/.test(flat),
    `${path} does not render the shared liability clauses — it would drift the moment either is edited`,
  );
  assert.ok(
    /insuranceClause\(/.test(flat),
    `${path} does not render the shared insurance clause`,
  );
}

// --- 3. No residential assumptions, no removed terms, anywhere -----------
const MUST_NOT_CONTAIN: [RegExp, string][] = [
  [/Building Manager/, 'calls the party "Building Manager" — a commercial landlord is not a building manager'],
  [/\bapartments?\b/i, 'assumes apartments'],
  [/parking garage/i, 'assumes a parking garage rather than any designated parking area'],
  [/pilot period/i, 'still promises a pilot period — the agreement is month-to-month with no minimum term'],
  [/\b(90|ninety)[)\s]*days?\b/i, 'still names a 90-day term'],
  [/Weekly \(or as agreed/i, 'still promises a weekly cadence'],
  [/Scheduled wash day:/, 'still names a fixed wash day'],
];
for (const { path, flat } of everything) {
  for (const [pattern, why] of MUST_NOT_CONTAIN) {
    const hit = flat.match(pattern);
    assert.equal(hit, null, `${path} ${why}\n  found: ${hit?.[0]}`);
  }
  // "Resident" alone excludes a commercial tenant; allowed only where the
  // definitions deliberately name residents AND tenants.
  const withoutDefinition = flat
    .replace(/residents and tenants of the Property/g, '')
    .replace(/residential or commercial/g, '');
  const resident = withoutDefinition.match(/\bresidents?\b/i);
  assert.equal(
    resident,
    null,
    `${path} still calls Occupants "residents", which excludes a commercial tenant\n  found: ${resident?.[0]}`,
  );
}

// --- 4. Shared terms present in every rendering --------------------------
for (const { path, flat } of sources) {
  assert.ok(/Property Manager/.test(flat), `${path} does not name the Property Manager party`);
  assert.ok(/month-to-month/i.test(flat), `${path} does not state the month-to-month term`);
  assert.ok(
    /residents and tenants of the Property/.test(flat),
    `${path} does not define "Occupants" to cover residential and commercial tenants`,
  );
  assert.ok(
    /residential or commercial/.test(flat),
    `${path} does not define "Property" as residential or commercial`,
  );
}

console.log(
  `contract consistency: all assertions passed (${LAVO_PROTECTIONS.length} protections at source, ${RENDERINGS.length} renderings)`,
);
