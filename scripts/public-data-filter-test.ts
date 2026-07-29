/**
 * Regression guard for QA fixtures leaking onto public city pages.
 * Run: npm run validate:public-data
 *
 * "Isolation Test Towers", "QA R3 Towers", and "Test Detailing Co Two" were
 * rendering on /cities/jersey-city and /cities/hoboken with real
 * Service/LocalBusiness JSON-LD (audit, July 2026). QA creates its fixtures
 * through the production signup flows, so those rows carry legitimate statuses
 * ("active", "approved") and a status filter alone never caught them.
 *
 * The fixtures below are the real production rows as of the audit. The
 * invariant: no fixture name reaches a city page view model, and every genuine
 * property and operator survives the filter.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CityPageTemplate } from '../components/marketing/city/CityPageTemplate';
import { applyLiveDataToCityPage } from '../lib/seo/cities/apply-live-data';
import { buildCityPage } from '../lib/seo/cities/build-city-page';
import { getMunicipalityBySlug } from '../lib/seo/cities/nj-municipalities';
import type { CityLiveData } from '../lib/seo/cities/city-live-data';
import {
  filterPublicEntities,
  isPubliclyListable,
  isTestEntityName,
} from '../lib/seo/public-data';

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

type BuildingRow = { name: string; slug: string | null; status: string; is_seed?: boolean };
type OperatorRow = { name: string; slug: string; status: string; base_price_cents: number };

/** Production `buildings` rows in prospect/pilot/active status at audit time. */
const BUILDING_ROWS: Record<string, BuildingRow[]> = {
  'jersey-city': [
    { name: 'Isolation Test Towers', slug: 'isolation-test-towers-jersey-city-ey1d', status: 'active' },
    { name: 'QA R3 Towers', slug: 'qa-r3-towers-jersey-city-6zs2', status: 'active' },
    { name: 'QA Test Towers', slug: 'qa-test-towers-jersey-city-p3w1', status: 'prospect' },
    { name: 'The Shore North', slug: 'the-shore-north-jersey-city-2rg4', status: 'prospect' },
  ],
  hoboken: [
    { name: 'Test Towers Two', slug: 'test-towers-two-hoboken-vuws', status: 'prospect' },
  ],
  newark: [
    { name: 'Arbol by Gomes', slug: 'gomes-orange-st', status: 'active' },
    { name: 'Astor by Gomes', slug: 'gomes-emmet-st', status: 'active' },
    { name: 'Envy by Gomes', slug: 'gomes-norfolk-st-58', status: 'active' },
    { name: 'Motto by Gomes', slug: 'gomes-mlk-blvd', status: 'active' },
    { name: 'Norfolk 2 by Gomes', slug: 'gomes-norfolk-st-50', status: 'active' },
    { name: 'Norfolk by Gomes', slug: 'gomes-norfolk-st-42', status: 'active' },
    { name: 'Nova by Gomes', slug: 'gomes-gibson-blvd', status: 'active' },
    { name: 'Olea by Gomes', slug: 'gomes-n-5th-st', status: 'active' },
    { name: 'Sussex by Gomes', slug: 'gomes-sussex-ave', status: 'active' },
    { name: 'Vida by Gomes', slug: 'gomes-hudson-st', status: 'active' },
  ],
};

/** Production `operators` rows at audit time. */
const OPERATOR_ROWS: OperatorRow[] = [
  { name: 'EcoWash NYC', slug: 'ecowash-nyc', status: 'approved', base_price_cents: 3499 },
  { name: 'merlo', slug: 'merlo', status: 'pending_review', base_price_cents: 3500 },
  { name: 'PureGleam Auto Spa', slug: 'puregleam', status: 'approved', base_price_cents: 3999 },
  { name: 'QA Operator R3', slug: 'qa-operator-r3', status: 'pending_review', base_price_cents: 0 },
  { name: 'QA Stripe Retest', slug: 'qa-stripe-retest', status: 'pending_review', base_price_cents: 0 },
  { name: 'QA Test Detailing Co', slug: 'qa-test-detailing-co', status: 'approved', base_price_cents: 3500 },
  { name: 'QuickShine Express', slug: 'quickshine', status: 'approved', base_price_cents: 1999 },
  { name: 'ShineRight Mobile Detailing', slug: 'shineright', status: 'approved', base_price_cents: 2999 },
  { name: 'Test Detailing Co', slug: 'test-detailing-co', status: 'pending_review', base_price_cents: 3500 },
  { name: 'Test Detailing Co Three', slug: 'test-detailing-co-three', status: 'approved', base_price_cents: 100 },
  { name: 'Test Detailing Co Two', slug: 'test-detailing-co-two', status: 'pending_review', base_price_cents: 100 },
  { name: 'Two Hands Car Detailing', slug: 'two-hands-car-detailing', status: 'pending_review', base_price_cents: 0 },
];

/** Names that must never appear in public output. */
const FIXTURE_NAMES = [
  'Isolation Test Towers',
  'QA R3 Towers',
  'QA Test Towers',
  'Test Towers Two',
  'QA Operator R3',
  'QA Stripe Retest',
  'QA Test Detailing Co',
  'Test Detailing Co',
  'Test Detailing Co Two',
  'Test Detailing Co Three',
];

/** Real entries the filter must not swallow. */
const REAL_NAMES = [
  'The Shore North',
  '200 Hudson Residences',
  'Arbol by Gomes',
  'Vida by Gomes',
  'EcoWash NYC',
  'PureGleam Auto Spa',
  'QuickShine Express',
  'ShineRight Mobile Detailing',
  'Two Hands Car Detailing',
  'merlo',
  // Near-misses that share letters with the markers but are legitimate. The
  // markers are matched on word boundaries precisely so these survive.
  'Testa Auto Spa',
  'Latest Shine Detailing',
  'Contest Motors',
  'Seedling Court Apartments',
  'Demolition Row Lofts',
];

function checkNameHeuristic() {
  for (const name of FIXTURE_NAMES) {
    if (!isTestEntityName(name)) fail(`"${name}" should be detected as a QA fixture`);
    if (isPubliclyListable({ name })) fail(`"${name}" should not be publicly listable`);
  }
  for (const name of REAL_NAMES) {
    if (isTestEntityName(name)) fail(`"${name}" was wrongly flagged as a QA fixture`);
    if (!isPubliclyListable({ name })) fail(`"${name}" should survive the filter`);
  }
  // An explicit is_seed flag opts a row out regardless of how real the name looks.
  if (isPubliclyListable({ name: 'Vida by Gomes', is_seed: true })) {
    fail('is_seed rows must never be publicly listable');
  }
  // A blank name can never be rendered.
  if (isPubliclyListable({ name: '  ' })) fail('blank names must not be publicly listable');
}

/** Active partnerships at audit time, keyed by building name. */
const PARTNERSHIPS: Record<string, string> = {
  'Isolation Test Towers': 'Test Detailing Co Three',
  'QA R3 Towers': 'QA Test Detailing Co',
  'The Shore North': 'Test Detailing Co Three',
  'Arbol by Gomes': 'Two Hands Car Detailing',
  'Astor by Gomes': 'Two Hands Car Detailing',
  'Envy by Gomes': 'Two Hands Car Detailing',
  'Motto by Gomes': 'Two Hands Car Detailing',
  'Norfolk 2 by Gomes': 'Two Hands Car Detailing',
  'Norfolk by Gomes': 'Two Hands Car Detailing',
  'Nova by Gomes': 'Two Hands Car Detailing',
  'Olea by Gomes': 'Two Hands Car Detailing',
  'Sussex by Gomes': 'Two Hands Car Detailing',
  'Vida by Gomes': 'Two Hands Car Detailing',
};

/**
 * Mirror of what fetchCityLiveData assembles, over the fixtures above.
 * `filtered: false` reproduces the pre-fix behaviour so the assertions below
 * cannot pass vacuously.
 */
function liveDataFor(citySlug: string, filtered = true): CityLiveData {
  const rows = BUILDING_ROWS[citySlug] ?? [];
  const buildings = filtered ? filterPublicEntities(rows) : rows;

  const partnered = new Set(
    buildings.map((b) => PARTNERSHIPS[b.name]).filter(Boolean) as string[],
  );
  const partneredOps = OPERATOR_ROWS.filter((o) => partnered.has(o.name));
  const operators = (
    filtered
      ? filterPublicEntities(partneredOps.filter((o) => o.status === 'approved'))
      : partneredOps
  ).sort((a, b) => a.name.localeCompare(b.name));

  const prices = operators
    .map((o) => o.base_price_cents)
    .filter((c) => (filtered ? c > 0 : true));
  return {
    buildings: buildings.map((b) => ({ name: b.name, slug: b.slug, status: b.status })),
    operators: operators.map((o) => ({ name: o.name, slug: o.slug })),
    pricingRangeCents: prices.length
      ? { min: Math.min(...prices), max: Math.max(...prices) }
      : null,
  };
}

/** Render the real city page component, JSON-LD graph included. */
function renderCity(citySlug: string, filtered: boolean): string {
  const muni = getMunicipalityBySlug(citySlug);
  if (!muni) fail(`municipality ${citySlug} not found`);
  const page = applyLiveDataToCityPage(
    buildCityPage(muni),
    muni,
    liveDataFor(citySlug, filtered),
  );
  return renderToStaticMarkup(createElement(CityPageTemplate, { page }));
}

function checkCityPage(citySlug: string) {
  const muni = getMunicipalityBySlug(citySlug);
  if (!muni) fail(`municipality ${citySlug} not found`);
  const page = applyLiveDataToCityPage(buildCityPage(muni), muni, liveDataFor(citySlug));
  const serialized = JSON.stringify(page);

  for (const name of FIXTURE_NAMES) {
    if (serialized.includes(name)) {
      fail(`/cities/${citySlug} still renders the QA fixture "${name}"`);
    }
  }
  // Slugs feed LocalBusiness JSON-LD urls, so check those independently.
  for (const b of page.buildingsSection?.buildings ?? []) {
    if (isTestEntityName(b.name) || isTestEntityName(b.slug ?? '')) {
      fail(`/cities/${citySlug} emits LocalBusiness schema for fixture "${b.name}"`);
    }
  }
  for (const o of page.operatorsSection?.operators ?? []) {
    if (isTestEntityName(o.name)) {
      fail(`/cities/${citySlug} names fixture operator "${o.name}"`);
    }
  }
  if (serialized.includes('$0') || serialized.includes('$1 ')) {
    fail(`/cities/${citySlug} renders a placeholder price from a QA operator`);
  }

  // Render the shipped component so the emitted JSON-LD graph is covered too.
  const leakedHtml = renderCity(citySlug, false);
  const presentBefore = FIXTURE_NAMES.filter((n) => leakedHtml.includes(n));
  if (presentBefore.length === 0) {
    fail(`/cities/${citySlug}: unfiltered render shows no fixtures — the test proves nothing`);
  }

  const html = renderCity(citySlug, true);
  for (const name of FIXTURE_NAMES) {
    if (html.includes(name)) {
      fail(`/cities/${citySlug} HTML still contains the QA fixture "${name}"`);
    }
  }
  if (/"@type":"LocalBusiness","@id":"[^"]*(qa|test|isolation)/i.test(html)) {
    fail(`/cities/${citySlug} emits LocalBusiness JSON-LD for a QA fixture`);
  }

  const buildings = page.buildingsSection?.buildings.length ?? 0;
  const operators = page.operatorsSection?.operators.length ?? 0;
  const localBusinesses = (html.match(/"@type":"LocalBusiness"/g) ?? []).length;
  console.log(
    `  /cities/${citySlug}: ${buildings} buildings, ${operators} operators, ` +
      `${localBusinesses} LocalBusiness nodes (was leaking ${presentBefore.length}: ${presentBefore.join(', ')})`,
  );
}

function checkRealDataSurvives() {
  const page = applyLiveDataToCityPage(
    buildCityPage(getMunicipalityBySlug('newark')!),
    getMunicipalityBySlug('newark')!,
    liveDataFor('newark'),
  );
  const names = (page.buildingsSection?.buildings ?? []).map((b) => b.name);
  if (names.length !== BUILDING_ROWS.newark.length) {
    fail(`Newark lost real buildings: expected ${BUILDING_ROWS.newark.length}, got ${names.length}`);
  }
  if (!names.includes('Vida by Gomes')) fail('Newark is missing "Vida by Gomes"');
  console.log(`  /cities/newark: ${names.length} real buildings retained`);
}

function main() {
  console.log('public-data filter');
  checkNameHeuristic();
  console.log('  name heuristic: ok');
  checkCityPage('jersey-city');
  checkCityPage('hoboken');
  checkRealDataSurvives();
  console.log('PASS: no QA fixture reaches a public city page');
}

main();
