/**
 * Regression tests for the contract PDF's layout.
 * Run: npx tsx scripts/contract-pdf-layout-test.ts
 *
 * The bug these guard against: packages and add-ons were drawn by passing
 * `name - description` straight to drawText. Operators write real marketing
 * copy in those fields, so two things broke at once — nothing wrapped, so long
 * labels ran under the price and off the page; and pdf-lib honours newlines
 * inside a string, so a description with line breaks drew several lines
 * downward while y advanced by exactly one, overprinting every package below.
 */
import assert from 'node:assert';
import { PDFPage } from 'pdf-lib';
import { renderContractPdf } from '../lib/contract-pdf';

const PAGE_W = 612;
const MARGIN = 48;

// A description shaped like the ones operators actually write.
const LONG_DESC = `Based on average condition. Heavy buildup, pet hair, stains, or neglected interiors may require additional time or cost.

Best For:
Vehicles that need a complete inside and out refresh, with enhanced gloss, added protection, and a clean, like-new finish.

What You'll Get:
A thorough interior and exterior detail that goes beyond a quick refresh, delivering a noticeably cleaner, more polished result across all surfaces.`;

type Draw = { page: number; text: string; x: number; y: number };

async function collectDraws(): Promise<Draw[]> {
  const draws: Draw[] = [];
  const pageIds = new Map<unknown, number>();
  let seq = 0;

  const orig = PDFPage.prototype.drawText;
  (PDFPage.prototype as any).drawText = function (text: string, opts: any) {
    if (!pageIds.has(this)) pageIds.set(this, ++seq);
    draws.push({ page: pageIds.get(this)!, text: String(text), x: opts?.x ?? 0, y: opts?.y ?? 0 });
    return orig.call(this, text, opts);
  };

  try {
    await renderContractPdf({
      effectiveDate: 'September 11, 2026',
      operator: { name: 'QA Detailing Co', insuranceApproved: true, basePriceCents: 4900 },
      building: {
        name: 'QA Middlebelt Center',
        address: '31700 Middlebelt Rd, Farmington Hills, MI 48334',
        managerName: 'QA Property Manager',
        managerEmail: 'qa.manager@lavoqa.test',
      },
      minBookings: 4,
      governingLaw: 'Michigan',
      packages: [
        { name: 'Luxury Refresh - Full Interior & Exterior Restoration + Paint Polish', description: LONG_DESC, priceCents: 43900 },
        { name: 'Signature Refresh - Full Interior + Exterior Restoration', description: LONG_DESC, priceCents: 32900 },
        { name: 'Essential Refresh - Interior + Exterior Detail', description: LONG_DESC, priceCents: 24900 },
      ],
      addons: [{ label: 'Engine bay detailing', priceCents: 6500 }],
    } as any);
  } finally {
    (PDFPage.prototype as any).drawText = orig;
  }
  return draws;
}

async function main() {
  const draws = await collectDraws();
  assert.ok(draws.length > 0, 'nothing was drawn');

  // Every string handed to drawText must be a single line. A newline here is
  // the overlap bug: pdf-lib renders it downward, the caller does not know.
  const withNewlines = draws.filter((d) => d.text.includes('\n'));
  assert.equal(
    withNewlines.length,
    0,
    `${withNewlines.length} draw(s) contain a newline — pdf-lib will render these downward and overprint what follows`,
  );

  // Nothing may start past the right margin.
  const overflow = draws.filter((d) => d.x > PAGE_W - MARGIN);
  assert.equal(overflow.length, 0, `${overflow.length} draw(s) start beyond the right margin`);

  // Label + right-aligned price legitimately share a baseline; three or more
  // means text is stacked on itself.
  for (const page of new Set(draws.map((d) => d.page))) {
    const byY = new Map<number, Draw[]>();
    for (const d of draws.filter((x) => x.page === page)) {
      const key = Math.round(d.y);
      byY.set(key, [...(byY.get(key) ?? []), d]);
    }
    for (const [y, list] of byY) {
      assert.ok(
        list.length <= 2,
        `page ${page} baseline y=${y} carries ${list.length} draws: ${list.map((l) => JSON.stringify(l.text.slice(0, 30))).join(', ')}`,
      );
    }
  }

  // A long description must actually consume vertical space rather than being
  // crammed onto one line — proof the wrapping ran.
  assert.ok(draws.length > 40, `expected long descriptions to wrap into many lines, saw only ${draws.length} draws`);

  console.log(`contract-pdf layout: all assertions passed (${draws.length} draws checked)`);
}

main();
