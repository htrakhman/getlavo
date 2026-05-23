/**
 * Emits county batch prompts for hand-editing municipality city pages.
 * Run: npx tsx scripts/nj-cities-draft.ts [county-slug]
 */

import manifest from '../data/nj-municipalities.json';

type Row = { name: string; slug: string; county: string; countySlug: string; type: string };

const countyFilter = process.argv[2];
const rows = (manifest as Row[]).filter((r) => !countyFilter || r.countySlug === countyFilter);

if (rows.length === 0) {
  console.error(`No municipalities for county slug: ${countyFilter ?? '(none)'}`);
  process.exit(1);
}

const byCounty = new Map<string, Row[]>();
for (const r of rows) {
  const list = byCounty.get(r.countySlug) ?? [];
  list.push(r);
  byCounty.set(r.countySlug, list);
}

for (const [countySlug, munis] of [...byCounty.entries()].sort()) {
  const sorted = [...munis].sort((a, b) => a.name.localeCompare(b.name));
  console.log(`\n## ${sorted[0]!.county} County (${countySlug}) — ${sorted.length} municipalities\n`);
  for (const m of sorted) {
    const neighbors = sorted
      .map((x) => x.name)
      .filter((n) => n !== m.name);
    const idx = neighbors.indexOf(
      sorted[sorted.findIndex((x) => x.slug === m.slug) - 1]?.name ?? '',
    );
    const nearby = sorted
      .slice(Math.max(0, sorted.findIndex((x) => x.slug === m.slug) - 1), sorted.findIndex((x) => x.slug === m.slug) + 2)
      .filter((x) => x.slug !== m.slug)
      .map((x) => x.name)
      .slice(0, 2);
    console.log(
      `- **${m.name}** (${m.type}, slug: \`${m.slug}\`) — neighbors: ${nearby.join(', ') || 'n/a'}`,
    );
  }
  console.log(
    '\nWrite unique CityPage copy per docs/nj-cities-content-spec.md; avoid repeating paragraphs within the county.\n',
  );
}
