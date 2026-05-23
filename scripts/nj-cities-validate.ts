/**
 * Validates NJ municipality manifest and runtime-built city pages.
 * Run: npx tsx scripts/nj-cities-validate.ts
 */

import manifest from '../data/nj-municipalities.json';
import { getAllCityPages, getMunicipalityCityPages, NJ_MUNICIPALITIES } from '../lib/seo/cities';
import { countWords } from '../lib/seo/cities/utils';

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

const MIN_WORDS: Record<1 | 2 | 3, number> = { 1: 1000, 2: 750, 3: 750 };
const MIN_FAQS: Record<1 | 2 | 3, number> = { 1: 12, 2: 10, 3: 8 };

const SLUG_RE = /^[a-z0-9-]+$/;

type ManifestRow = { slug: string; name: string; countySlug: string; geoid: string };

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function pageText(page: ReturnType<typeof getMunicipalityCityPages>[0]): string[] {
  return [
    page.h1,
    page.hero.subheadline,
    ...page.hero.plainEnglish,
    page.hero.aeoSummary,
    ...Object.values(page.atAGlance),
    ...page.overview.paragraphs,
    ...page.audience.cards.flatMap((c) => [c.title, ...c.bullets]),
    ...page.howItWorks.residents.flatMap((s) => [s.title, s.description]),
    ...page.howItWorks.propertyManagers.flatMap((s) => [s.title, s.description]),
    ...page.howItWorks.operators.flatMap((s) => [s.title, s.description]),
    ...page.whyBuildings.paragraphs,
    ...page.whyBuildings.bullets,
    ...page.propertyTypes.rows.flatMap((r) => [r.propertyType, r.whyItWorks, r.whatLavoNeeds]),
    ...page.parking.paragraphs,
    ...page.parking.checklist,
    ...page.residentBenefits.paragraphs,
    ...page.residentBenefits.bullets,
    ...page.propertyManagerBenefits.paragraphs,
    ...page.propertyManagerBenefits.bullets,
    ...page.services.rows.flatMap((r) => [r.service, r.bestFor, r.usuallyIncludes, r.notes]),
    ...page.vehicleCare.paragraphs,
    ...page.operators.paragraphs,
    ...page.operators.bullets,
    ...page.requestResident.paragraphs,
    ...page.requestResident.steps,
    ...page.launchProperty.paragraphs,
    ...page.launchProperty.steps,
    ...page.faqs.flatMap((f) => [f.question, f.answer]),
  ];
}

function main() {
  const rows = manifest as ManifestRow[];
  const municipalityPages = getMunicipalityCityPages();
  const allPages = getAllCityPages();

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
    if (!allPages.some((c) => c.slug === slug)) fail(`Missing preserved slug: ${slug}`);
  }

  if (municipalityPages.length !== rows.length) {
    fail(`Page count ${municipalityPages.length} does not match manifest ${rows.length}`);
  }

  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const page of municipalityPages) {
    if (titles.has(page.meta.title)) fail(`Duplicate meta title: ${page.meta.title}`);
    titles.add(page.meta.title);

    if (descriptions.has(page.meta.description)) {
      fail(`Duplicate meta description for ${page.slug}`);
    }
    descriptions.add(page.meta.description);

    if (page.meta.description.length > 165) {
      fail(`${page.slug} meta description too long: ${page.meta.description.length}`);
    }

    const words = countWords(pageText(page));
    const minWords = MIN_WORDS[page.tier];
    if (words < minWords) {
      fail(`${page.slug} (tier ${page.tier}) has ${words} words, need ${minWords}`);
    }

    const minFaqs = MIN_FAQS[page.tier];
    if (page.faqs.length < minFaqs) {
      fail(`${page.slug} has ${page.faqs.length} FAQs, need ${minFaqs}`);
    }

    const body = pageText(page).join(' ');
    if (!body.includes(page.localName)) {
      fail(`${page.slug} missing localName in body`);
    }
    if (!body.includes(page.county)) {
      fail(`${page.slug} missing county in body`);
    }
  }

  const byCounty = new Map<string, typeof municipalityPages>();
  for (const page of municipalityPages) {
    const list = byCounty.get(page.countySlug) ?? [];
    list.push(page);
    byCounty.set(page.countySlug, list);
  }

  for (const [countySlug, pages] of byCounty) {
    const paragraphCounts = new Map<string, number>();
    for (const page of pages) {
      for (const p of page.overview.paragraphs) {
        paragraphCounts.set(p, (paragraphCounts.get(p) ?? 0) + 1);
      }
    }
    const dupes = [...paragraphCounts.entries()].filter(([, n]) => n > 2);
    if (dupes.length > 0) {
      fail(
        `County ${countySlug} has ${dupes.length} overview paragraphs repeated more than twice`,
      );
    }
  }

  console.log(
    `OK: ${rows.length} municipalities, ${allPages.length} total city pages (incl. state)`,
  );
}

main();
