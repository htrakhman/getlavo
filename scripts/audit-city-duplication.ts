/**
 * SEO duplication audit for city pages.
 * Run: npx tsx scripts/audit-city-duplication.ts
 */

import { getMunicipalityCityPages } from '../lib/seo/cities';
import { SHORE_COUNTY_SLUGS } from '../lib/seo/cities/region-flags';

const SHORE = new Set(SHORE_COUNTY_SLUGS);

function main() {
  const pages = getMunicipalityCityPages();
  const blockCounts = new Map<string, number>();
  let shoreLeak = 0;

  for (const page of pages) {
    const body = [
      ...page.hero.plainEnglish,
      page.hero.trustLine,
      ...page.vehicleCare.paragraphs.join(' ').includes('Shore-adjacent') ? ['Shore-adjacent'] : [],
      ...page.audience.cards.flatMap((c) => c.bullets),
      ...page.howItWorks.residents.map((s) => s.description),
    ].join('\n');

    if (body.includes('Shore-adjacent') && !SHORE.has(page.countySlug)) {
      shoreLeak++;
    }

    const audienceHash = page.audience.cards.map((c) => c.bullets.join('|')).join('||');
    blockCounts.set(audienceHash, (blockCounts.get(audienceHash) ?? 0) + 1);

    for (const line of page.hero.plainEnglish) {
      blockCounts.set(`hero:${line}`, (blockCounts.get(`hero:${line}`) ?? 0) + 1);
    }
  }

  const dupes = [...blockCounts.entries()]
    .filter(([, n]) => n > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  console.log(`Audited ${pages.length} municipality pages`);
  console.log(`Shore-adjacent leakage on non-shore counties: ${shoreLeak}`);
  console.log('\nTop repeated blocks (>2 pages):');
  for (const [text, n] of dupes) {
    console.log(`  ${n}x  ${text.slice(0, 90)}${text.length > 90 ? '…' : ''}`);
  }

  if (shoreLeak > 0) {
    process.exit(1);
  }
}

main();
