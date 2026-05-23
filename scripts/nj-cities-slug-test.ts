/**
 * Slug integrity tests for NJ municipalities manifest.
 * Run: npx tsx scripts/nj-cities-slug-test.ts
 */

import manifest from '../data/nj-municipalities.json';

const EXISTING_SLUGS = [
  'jersey-city',
  'hoboken',
  'newark',
  'morristown',
  'edgewater',
  'fort-lee',
  'weehawken',
  'hackensack',
  'paramus',
];

const SLUG_RE = /^[a-z0-9-]+$/;

type Row = { slug: string; name: string; county: string; countySlug: string };

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function main() {
  const rows = manifest as Row[];
  const slugs = rows.map((r) => r.slug);

  if (rows.length < 564) fail(`Expected at least 564 municipalities, got ${rows.length}`);
  if (new Set(slugs).size !== slugs.length) fail('Duplicate slugs detected');

  for (const slug of slugs) {
    if (!SLUG_RE.test(slug)) fail(`Invalid slug: ${slug}`);
  }

  for (const slug of EXISTING_SLUGS) {
    if (!slugs.includes(slug)) fail(`Missing preserved slug: ${slug}`);
  }

  console.log(`OK: ${rows.length} unique slugs, ${EXISTING_SLUGS.length} preserved slugs present`);
}

main();
