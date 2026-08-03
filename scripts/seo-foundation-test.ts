/**
 * Regression guard for the SEO/AEO foundation components.
 * Run: npm run validate:seo-foundation
 *
 * These are the invariants the foundation exists to hold. Each one is a bug
 * that ships silently if it regresses — a missing answer-first block, a schema
 * that disagrees with the visible copy, or a stale served-city list all render
 * fine and look correct in review.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnswerFirstPage } from '../components/marketing/AnswerFirstPage';
import { FaqBlock } from '../components/seo/FaqBlock';
import { formatDisplayDate, toIsoDate } from '../lib/seo/dates';
import { normalizeFaqs } from '../lib/seo/faq';
import { faqPageSchema, howToSchema, siteLocalBusinessSchema } from '../lib/seo/schema';
import { normalizeState, toServedAreas } from '../lib/seo/served-areas';

let failures = 0;

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ok   ${label}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${label}${detail ? `\n       ${detail}` : ''}`);
}

function render(element: Parameters<typeof renderToStaticMarkup>[0]): string {
  return renderToStaticMarkup(element);
}

function jsonLdBlocks(html: string): Record<string, unknown>[] {
  const matches = html.matchAll(
    /<script type="application\/ld\+json">(.*?)<\/script>/gs,
  );
  return [...matches].map((m) => JSON.parse(decodeEntities(m[1]!)));
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

const BASE_PROPS = {
  path: '/resources/example',
  h1: 'Can apartment residents get a mobile car wash?',
  answerFirst:
    'Yes. Apartment residents can book a mobile car wash that comes to their building garage, ' +
    'provided the property has approved an operator to work on site.',
  dateModified: '2026-08-03',
};

// ---------------------------------------------------------------------------
console.log('\nanswer-first block is required');
// ---------------------------------------------------------------------------
{
  let threw = false;
  try {
    render(createElement(AnswerFirstPage, { ...BASE_PROPS, answerFirst: '' }));
  } catch {
    threw = true;
  }
  check('empty string throws rather than rendering a page with no answer', threw);

  let threwOnBlank = false;
  try {
    render(createElement(AnswerFirstPage, { ...BASE_PROPS, answerFirst: ['   ', ''] }));
  } catch {
    threwOnBlank = true;
  }
  check('whitespace-only array throws', threwOnBlank);

  const html = render(createElement(AnswerFirstPage, BASE_PROPS));
  check('renders a data-answer-first block', html.includes('data-answer-first'));

  const h1Index = html.indexOf('<h1');
  const answerIndex = html.indexOf('data-answer-first');
  const firstH2 = html.indexOf('<h2');
  check(
    'answer block sits between the h1 and the first h2',
    h1Index !== -1 && answerIndex > h1Index && (firstH2 === -1 || answerIndex < firstH2),
    `h1@${h1Index} answer@${answerIndex} h2@${firstH2}`,
  );
}

// ---------------------------------------------------------------------------
console.log('\nexactly one h1');
// ---------------------------------------------------------------------------
{
  const html = render(
    createElement(AnswerFirstPage, {
      ...BASE_PROPS,
      sections: [
        { heading: 'How it works', body: ['Residents book from their phone.'] },
        { heading: 'What it costs', body: ['Operators set their own rates.'] },
      ],
    }),
  );
  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  check('one h1 on the page', h1Count === 1, `found ${h1Count}`);
}

// ---------------------------------------------------------------------------
console.log('\nheading hierarchy never skips a level');
// ---------------------------------------------------------------------------
{
  const html = render(
    createElement(AnswerFirstPage, {
      ...BASE_PROPS,
      sections: [
        {
          heading: 'Top level',
          body: ['Body.'],
          sections: [
            {
              heading: 'Second level',
              body: ['Body.'],
              sections: [{ heading: 'Third level', body: ['Body.'] }],
            },
          ],
        },
      ],
    }),
  );

  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  let skipped: string | null = null;
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i]! > levels[i - 1]! + 1) {
      skipped = `h${levels[i - 1]} -> h${levels[i]}`;
      break;
    }
  }
  check('no skipped heading levels', skipped === null, skipped ?? undefined);
  check('nesting produces h2/h3/h4', levels.join(',') === '1,2,3,4', levels.join(','));
}

// ---------------------------------------------------------------------------
console.log('\nvisible date and dateModified come from one value');
// ---------------------------------------------------------------------------
{
  const html = render(createElement(AnswerFirstPage, { ...BASE_PROPS, article: true }));
  const graph = jsonLdBlocks(html)[0]!;
  const nodes = (graph['@graph'] as Record<string, unknown>[]) ?? [];
  const webPage = nodes.find((n) => n['@type'] === 'WebPage');
  const article = nodes.find((n) => n['@type'] === 'Article');

  // React SSR emits the JSX prop name verbatim (`dateTime`); HTML parsers
  // ASCII-lowercase attribute names, so this is the `datetime` attribute.
  check(
    'visible time element carries the ISO date',
    /<time\s+datetime="2026-08-03"/i.test(html),
  );
  check('human-readable date is rendered', html.includes(formatDisplayDate('2026-08-03')));
  check('WebPage.dateModified matches', webPage?.dateModified === '2026-08-03');
  check('Article.dateModified matches', article?.dateModified === '2026-08-03');
  check('answer-first copy is exposed as WebPage.abstract', typeof webPage?.abstract === 'string');
}

// ---------------------------------------------------------------------------
console.log('\nFAQ schema cannot drift from the visible accordion');
// ---------------------------------------------------------------------------
{
  const items = [
    { question: 'Does the building pay?', answer: 'No. Buildings add Lavo at no cost.' },
    { question: 'Who chooses the operator?', answer: 'The property team sends the request.' },
    // Duplicates and incomplete pairs must drop from both outputs together.
    { question: 'Does the building pay?', answer: 'Duplicate that should be dropped.' },
    { question: '  ', answer: 'Orphan answer.' },
    { question: 'Orphan question', answer: '   ' },
  ];

  const html = render(createElement(FaqBlock, { path: '/resources/example', items }));
  const schema = jsonLdBlocks(html)[0]!;
  const questions = (schema.mainEntity as Record<string, unknown>[]).map((q) => q.name as string);
  const normalized = normalizeFaqs(items);

  check('schema drops duplicates and incomplete pairs', questions.length === 2, questions.join(' | '));
  check(
    'every schema question appears in the rendered HTML',
    questions.every((q) => html.includes(q)),
  );
  check(
    'every schema answer appears in the rendered HTML',
    (schema.mainEntity as Record<string, unknown>[]).every((q) =>
      html.includes(((q.acceptedAnswer as Record<string, unknown>).text as string)),
    ),
  );
  check(
    'visible and schema derive from the same normalized list',
    normalized.every((f) => html.includes(f.question) && questions.includes(f.question)),
  );
  check(
    'collapsed answers stay in the DOM for crawlers',
    html.includes('<details') && html.includes('No. Buildings add Lavo at no cost.'),
  );
}

// ---------------------------------------------------------------------------
console.log('\nFAQ schema is emitted once per page');
// ---------------------------------------------------------------------------
{
  const html = render(
    createElement(AnswerFirstPage, {
      ...BASE_PROPS,
      faqs: [{ question: 'Is it free?', answer: 'Yes, for the property.' }],
    }),
  );
  const blocks = jsonLdBlocks(html);
  const faqNodes = blocks.flatMap((b) => {
    const graph = (b['@graph'] as Record<string, unknown>[]) ?? [b];
    return graph.filter((n) => n['@type'] === 'FAQPage');
  });
  check('template emits exactly one FAQPage node', faqNodes.length === 1, `found ${faqNodes.length}`);
  check('the FAQ still renders visibly', html.includes('Is it free?'));
}

// ---------------------------------------------------------------------------
console.log('\nserved areas derive from building rows, not a literal');
// ---------------------------------------------------------------------------
{
  // Real production shapes: Jersey City carries both "NJ" and "New Jersey".
  const rows = [
    { name: 'The Shore North', city: 'Jersey City', region: 'NJ' },
    { name: 'Hamilton Square', city: 'Jersey City', region: 'New Jersey' },
    { name: 'Newark Lofts', city: 'Newark', region: 'NJ' },
    { name: 'QA Test Towers', city: 'Hoboken', region: 'NJ' },
    { name: 'Seeded Row', city: 'Bayonne', region: 'NJ', is_seed: true },
    { name: 'No Region', city: 'Nowhere', region: null },
  ];

  const areas = toServedAreas(rows);
  const names = areas.map((a) => `${a.city}, ${a.state}`);

  check('region variants collapse to one entry', names.filter((n) => n.startsWith('Jersey City')).length === 1, names.join(' | '));
  check('"New Jersey" normalizes to "NJ"', normalizeState('New Jersey') === 'NJ');
  check('two-letter regions pass through uppercased', normalizeState('nj') === 'NJ');
  check('unknown regions are rejected', normalizeState('Atlantis') === null);
  check('QA fixtures are excluded', !names.some((n) => n.startsWith('Hoboken')), names.join(' | '));
  check('is_seed rows are excluded', !names.some((n) => n.startsWith('Bayonne')));
  check('rows without a usable region are excluded', !names.some((n) => n.startsWith('Nowhere')));
  check('Newark is included from live data', names.includes('Newark, NJ'));
  check(
    'NJ cities carry their county',
    areas.find((a) => a.city === 'Newark')?.county === 'Essex',
    JSON.stringify(areas.find((a) => a.city === 'Newark')),
  );
  check(
    'ordering is stable across runs',
    JSON.stringify(toServedAreas(rows)) === JSON.stringify(toServedAreas([...rows].reverse())),
  );
}

// ---------------------------------------------------------------------------
console.log('\nsitewide LocalBusiness');
// ---------------------------------------------------------------------------
{
  const withAreas = siteLocalBusinessSchema({
    areaServed: [{ city: 'Jersey City', state: 'NJ', county: 'Hudson' }],
  });
  const area = (withAreas.areaServed as Record<string, unknown>[])[0]!;
  const state = area.containedInPlace as Record<string, unknown>;

  check('areaServed is a City node', area['@type'] === 'City' && area.name === 'Jersey City');
  check('city is contained in its state', state['@type'] === 'State' && state.name === 'NJ');
  check(
    'county is attached when known',
    (state.containedInPlace as Record<string, unknown>)?.name === 'Hudson County',
  );
  check(
    'shares the #organization @id so it is one entity',
    String(withAreas['@id']).endsWith('/#organization'),
  );

  const noAreas = siteLocalBusinessSchema({ areaServed: null });
  check('areaServed is omitted when the lookup fails', !('areaServed' in noAreas));
}

// ---------------------------------------------------------------------------
console.log('\nHowTo');
// ---------------------------------------------------------------------------
{
  const schema = howToSchema({
    path: '/how-it-works',
    name: 'How to add a car wash amenity',
    description: 'Three steps.',
    steps: [
      { name: 'Add the building', text: 'Create the property on Lavo.' },
      { name: 'Pick an operator', text: 'Send a partnership request.' },
    ],
  });
  const steps = schema.step as Record<string, unknown>[];
  check('steps are positional', steps[0]!.position === 1 && steps[1]!.position === 2);
  check('steps are HowToStep nodes', steps.every((s) => s['@type'] === 'HowToStep'));
}

// ---------------------------------------------------------------------------
console.log('\ndate handling is timezone-stable');
// ---------------------------------------------------------------------------
{
  check('bare dates round-trip', toIsoDate('2026-08-03') === '2026-08-03');
  check('timestamps reduce to a date', toIsoDate('2026-08-03T23:30:00Z') === '2026-08-03');
  check('display format is fixed to UTC', formatDisplayDate('2026-08-03') === 'August 3, 2026');

  let threw = false;
  try {
    toIsoDate('not a date');
  } catch {
    threw = true;
  }
  check('invalid dates throw', threw);
}

// ---------------------------------------------------------------------------
console.log('\nFAQPage schema shape');
// ---------------------------------------------------------------------------
{
  const schema = faqPageSchema('/example', [{ question: 'Q?', answer: 'A.' }]);
  const entity = (schema.mainEntity as Record<string, unknown>[])[0]!;
  check('mainEntity holds Question nodes', entity['@type'] === 'Question');
  check(
    'answers are acceptedAnswer/Answer',
    (entity.acceptedAnswer as Record<string, unknown>)['@type'] === 'Answer',
  );
}

console.log('');
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log('All SEO foundation checks passed.');
