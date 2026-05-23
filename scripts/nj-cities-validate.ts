/**
 * Validates NJ municipality manifest and generated city content.
 * Run: npx tsx scripts/nj-cities-validate.ts
 */

import manifest from '../data/nj-municipalities.json';
import { CITIES, getMunicipalityCities } from '../lib/seo/cities';
import { NJ_MUNICIPALITIES } from '../lib/seo/cities/nj-municipalities';

const EXISTING_SLUGS = [
  'new-jersey',
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

const MIN_PARAGRAPH_LEN = 40;
const SLUG_RE = /^[a-z0-9-]+$/;

type ManifestRow = { slug: string; name: string; countySlug: string; geoid: string };

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function main() {
  const rows = manifest as ManifestRow[];
  const municipalityPages = getMunicipalityCities();

  if (rows.length !== NJ_MUNICIPALITIES.length) {
    fail(`Manifest length mismatch: ${rows.length} vs ${NJ_MUNICIPALITIES.length}`);
  }

  const manifestSlugs = rows.map((r) => r.slug);
  if (new Set(manifestSlugs).size !== manifestSlugs.length) {
    fail('Duplicate slugs in manifest');
  }

  for (const slug of manifestSlugs) {
    if (!SLUG_RE.test(slug)) fail(`Invalid slug format: ${slug}`);
  }

  for (const slug of EXISTING_SLUGS) {
    if (!CITIES.some((c) => c.slug === slug)) fail(`Missing preserved slug: ${slug}`);
  }

  if (municipalityPages.length !== rows.length) {
    fail(
      `Content count ${municipalityPages.length} does not match manifest ${rows.length}`,
    );
  }

  const contentBySlug = new Map(municipalityPages.map((c) => [c.slug, c]));
  for (const row of rows) {
    const page = contentBySlug.get(row.slug);
    if (!page) fail(`Missing city page for slug: ${row.slug}`);
    if (page.localName !== row.name) {
      fail(`localName mismatch for ${row.slug}: ${page.localName} vs ${row.name}`);
    }
    if (page.countySlug !== row.countySlug) {
      fail(`countySlug mismatch for ${row.slug}`);
    }

    const sections = [
      page.opening,
      ...page.mobileCarWash,
      ...page.residents,
      ...page.buildings,
      ...page.propertyManagers,
      ...page.operators,
      ...page.request,
    ];
    for (const p of sections) {
      if (p.length < MIN_PARAGRAPH_LEN) {
        fail(`Section too short on ${row.slug}: ${p.slice(0, 50)}...`);
      }
    }
    if (page.faqs.length < 3) fail(`${row.slug} needs at least 3 FAQs`);
  }

  // Duplicate paragraph check within each county
  const byCounty = new Map<string, typeof municipalityPages>();
  for (const page of municipalityPages) {
    const list = byCounty.get(page.countySlug) ?? [];
    list.push(page);
    byCounty.set(page.countySlug, list);
  }

  for (const [countySlug, pages] of byCounty) {
    const paragraphCounts = new Map<string, number>();
    for (const page of pages) {
      const all = [
        ...page.mobileCarWash,
        ...page.residents,
        ...page.buildings,
        ...page.propertyManagers,
        ...page.operators,
      ];
      for (const p of all) {
        paragraphCounts.set(p, (paragraphCounts.get(p) ?? 0) + 1);
      }
    }
    const dupes = [...paragraphCounts.entries()].filter(([, n]) => n > 2);
    if (dupes.length > 0) {
      fail(
        `County ${countySlug} has ${dupes.length} paragraphs repeated more than twice (e.g. "${dupes[0]![0].slice(0, 60)}...")`,
      );
    }
  }

  console.log(
    `OK: ${rows.length} municipalities, ${CITIES.length} total city pages (incl. state)`,
  );
}

main();
