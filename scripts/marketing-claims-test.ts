/**
 * Public copy must not claim a diligence step Lavo does not actually perform.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/marketing-claims-test.ts
 *
 * Lavo's defence in a damage, theft or injury claim is that it is a platform:
 * the operator is an independent business, the operator is responsible for the
 * work, and the operator's insurance pays. Two things break that defence, and
 * neither lives in the service agreement.
 *
 * The first is claiming a check that never ran. The site said operators were
 * "background-checked" while every operator row sat at
 * background_check_status = 'pending' with no Checkr candidate — a specific,
 * false, material statement that a resident relies on when they hand over a
 * key. A contract term pointing claims at the operator does not answer a
 * negligent-misrepresentation claim against Lavo for that sentence.
 *
 * The second is advertising a duty Lavo does not want. "We handle operator
 * vetting" is an assumption of responsibility for who gets onto the platform,
 * which is the opening for a negligent-selection claim.
 *
 * So the rule is: describe what is verifiable (insurance documentation is
 * collected and reviewed; the property approves the operator; the operator is
 * independent) and never assert a screening outcome. If Checkr is actually
 * wired up and running for every live operator, this test is the place to
 * relax — deliberately, not by accident.
 *
 * NOT LEGAL ADVICE.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

/** Public-facing copy. Operator/manager dashboards describe real record state. */
const ROOTS = ['app', 'components'];
// app/api renders nothing to a user: its route handlers and their comments are
// implementation, not claims. (The Checkr webhook there is still only a stub —
// which is exactly why the copy may not promise a background check.)
const SKIP_DIRS = new Set(['node_modules', '.next', 'api']);
// Internal admin tooling describes the mechanism to the operator of the
// platform, not a claim to a customer — app/(admin)/admin/insurance states
// plainly that certificates auto-verify on a timer, which is the truth these
// patterns exist to protect. Customer-facing copy has no such exemption.
const SKIP_PATH = /^app\/\(admin\)\//;
/** These render a specific operator's own stored status, not a platform claim. */
const ALLOWED_FILES = new Set<string>([]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const BANNED: [RegExp, string][] = [
  [/\bvetted\b/i, 'claims operators are "vetted" — Lavo does not run a screening that supports the word'],
  [/\bvetting\b/i, 'advertises a "vetting" function, which assumes a duty to screen and invites a negligent-selection claim'],
  [
    /background[\s-]?check(ed)?\b/i,
    'claims a background check — every operator row is background_check_status = pending with no Checkr candidate, so this is a false statement of fact',
  ],
  [/\bguaranteed\b/i, 'promises a guarantee; the service agreement expressly disclaims guarantees of volume and quality'],
  [/\bfully insured\b/i, 'states operators are "fully insured" rather than that insurance is on file'],
  // Certificates are promoted by a timer (lib/insurance-auto-verify.ts) — the
  // admin queue is a rejection window, not a gate, and nobody opens the file.
  // The service agreement now says Lavo "does not verify, endorse or warrant"
  // any coverage, so a Verified badge contradicts the contract in the same
  // product. Say "on file", which is exactly what is true.
  // Scoped to insurance: "verified reviews" elsewhere is accurate — wash_reviews
  // carries a booking_id, so a review really does come from a completed wash.
  [
    /(?:insurance|certificate|policy|coverage|COI)[^.]{0,60}\bverif(?:y|ied|ication)\b|\bverif(?:y|ied|ication)\b[^.]{0,60}(?:insurance|certificate|policy|coverage|COI)/i,
    'claims insurance is "verified" — certificates auto-approve on a timer (lib/insurance-auto-verify.ts) and nobody reads the policy',
  ],
  [
    /additional insured wording must/i,
    'requires additional-insured wording, which the agreement no longer requires and the platform never checks',
  ],
];

/** Identifiers and DB columns legitimately contain these words. */
// Word-boundary anchored: a bare `CheckRow` component must not exempt a line
// (it did, and "Vetted operator assigned" slipped through a grep because of it).
const CODE_CONTEXT = /\bbackground_check\w*|\bbackgroundCheck\w*|\bcheckr_\w+|\bcheckrCandidate|['"]checkr['"]/i;

const offenders: string[] = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (ALLOWED_FILES.has(file) || SKIP_PATH.test(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (CODE_CONTEXT.test(line)) return;
      // Comments and imports are implementation, not claims to a user.
      const t = line.trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      if (t.startsWith('import ') || t.startsWith('} from ')) return;
      for (const [pattern, why] of BANNED) {
        if (pattern.test(line)) offenders.push(`${file}:${i + 1} ${why}\n  ${line.trim().slice(0, 140)}`);
      }
    });
  }
}

assert.equal(
  offenders.length,
  0,
  `Public copy makes claims Lavo cannot support:\n\n${offenders.join('\n\n')}\n\n` +
    'Either make the claim true (and relax this test on purpose) or describe what is verifiable.',
);

console.log(`marketing claims: no unsupported diligence claims (${BANNED.length} patterns checked)`);
