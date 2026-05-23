/**
 * Preview built city page stats. Run: npx tsx scripts/preview-city-page.ts [slug]
 */

import { getCityPageBySlug } from '../lib/seo/cities';
import { countWords } from '../lib/seo/cities/utils';

const slugs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['jersey-city', 'atlantic-city', 'absecon'];

function preview(slug: string) {
  const page = getCityPageBySlug(slug);
  if (!page) {
    console.log(`\n--- ${slug}: NOT FOUND ---`);
    return;
  }
  const text = [
    page.hero.aeoSummary,
    ...page.overview.paragraphs,
    ...page.faqs.map((f) => f.answer),
  ];
  console.log(`\n--- ${slug} (tier ${page.tier}) ---`);
  console.log('Title:', page.meta.title);
  console.log('Description:', page.meta.description, `(${page.meta.description.length} chars)`);
  console.log('H1:', page.h1);
  console.log('Words (partial):', countWords(text));
  console.log('FAQs:', page.faqs.length);
  console.log('Nearby:', page.nearbyCities.map((c) => c.name).join(', ') || 'n/a');
}

for (const slug of slugs) preview(slug);
