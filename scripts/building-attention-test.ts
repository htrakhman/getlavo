/**
 * A red dot must always be answerable.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/building-attention-test.ts
 *
 * The bug this pins: the sidebar dot was computed from a cross-building query
 * and the Contract tab's dot from a query scoped to the selected building. A
 * manager who had signed the building they were looking at, with offers still
 * open on two others, saw a dot in the nav and a page with nothing marked on
 * it. A dot that cannot be followed to a named item is worse than no dot — it
 * spends attention and returns nothing.
 *
 * So the invariant is structural: every nav href that gets a dot must be the
 * navHref of at least one real item, and every item must link somewhere.
 * Asserted against the pure helpers so it needs no database.
 */
import assert from 'node:assert';
import { attentionNavHrefs, type AttentionItem } from '../lib/building-attention';
import { headingsWithAlerts } from '../components/PortalShell';

const item = (over: Partial<AttentionItem>): AttentionItem => ({
  key: 'k', label: 'L', detail: 'D', href: '/building/contract#sign',
  navHref: '/building/marketplace', buildingId: 'b1', otherBuilding: false, ...over,
});

// --- Every dot traces back to an item -----------------------------------
{
  const items = [
    item({ key: 'signature:b2', navHref: '/building/marketplace', buildingId: 'b2', otherBuilding: true }),
    item({ key: 'residents', navHref: '/building/residents' }),
  ];
  const hrefs = attentionNavHrefs(items);
  assert.deepEqual([...hrefs].sort(), ['/building/marketplace', '/building/residents']);
  for (const href of hrefs) {
    assert.ok(items.some((i) => i.navHref === href), `dot on ${href} matches no item`);
  }
}

// --- No items, no dots. An empty checklist must not light up the nav -----
assert.deepEqual(attentionNavHrefs([]), [], 'dots appear with nothing outstanding');

// --- One dot per nav entry, however many items sit under it -------------
{
  const three = ['b1', 'b2', 'b3'].map((b) =>
    item({ key: `signature:${b}`, buildingId: b, otherBuilding: b !== 'b1' }),
  );
  assert.deepEqual(attentionNavHrefs(three), ['/building/marketplace'], 'duplicate dots for one nav entry');
}

// --- An item for another building still raises the dot ------------------
// The whole point: signing the selected building must not silence the rest.
{
  const otherOnly = [item({ key: 'signature:b9', buildingId: 'b9', otherBuilding: true })];
  assert.deepEqual(
    attentionNavHrefs(otherOnly),
    ['/building/marketplace'],
    'an agreement open on another building no longer flags the nav',
  );
}

// --- Every item is actionable -------------------------------------------
{
  const all = [
    item({ key: 'signature:b1' }),
    item({ key: 'operator', href: '/building/marketplace', navHref: '/building/marketplace' }),
    item({ key: 'residents', href: '/building/residents', navHref: '/building/residents' }),
    item({ key: 'wash-days', href: '/building/wash-days', navHref: '/building/wash-days' }),
  ];
  for (const i of all) {
    assert.ok(i.href.length > 1, `${i.key} has no destination`);
    assert.ok(i.label.trim() && i.detail.trim(), `${i.key} has no label or detail to show`);
    // A dot the user follows lands on a page; it must not point at a bare API
    // route unless it is the building-switch redirect, which is deliberate.
    assert.ok(
      !i.href.startsWith('/api/') || i.href.startsWith('/api/building/select'),
      `${i.key} points at an API route that renders no page`,
    );
  }
}

// --- Section headings still roll up their children's dots ---------------
{
  const nav = [{ heading: 'Setup' }, { href: '/building/marketplace', label: 'My operator' }];
  assert.deepEqual([...headingsWithAlerts(nav, new Set(['/building/marketplace']))], [0]);
  assert.deepEqual([...headingsWithAlerts(nav, new Set())], []);
}

// --- Every page a dot points at must explain itself ----------------------
// The dot says a page needs something; the page has to say what. Residents
// showed a dot in the nav and then an empty table reading "No residents
// enrolled yet" — an empty-state description, not the thing the dot meant.
// So: every navHref the helper can emit must belong to a page that renders
// the matching slice of the list. Add an item for a new page without wiring
// it up and this fails rather than shipping another unanswerable dot.
{
  const fs = require('node:fs') as typeof import('node:fs');
  const source = fs.readFileSync('lib/building-attention.ts', 'utf8');

  const navHrefs = new Set(
    [...source.matchAll(/navHref:\s*'([^']+)'/g)].map((m) => m[1]),
  );
  assert.ok(navHrefs.size > 0, 'found no navHref literals — did the field get renamed?');

  const PAGE_FOR: Record<string, string> = {
    '/building': 'app/(building)/building/page.tsx',
    '/building/marketplace': 'app/(building)/building/marketplace/page.tsx',
    '/building/residents': 'app/(building)/building/residents/page.tsx',
    '/building/wash-days': 'app/(building)/building/wash-days/page.tsx',
    '/building/announcements': 'app/(building)/building/announcements/page.tsx',
    '/building/issues': 'app/(building)/building/issues/page.tsx',
    '/building/settings': 'app/(building)/building/settings/page.tsx',
  };

  for (const href of navHrefs) {
    const page = PAGE_FOR[href];
    assert.ok(page, `navHref ${href} has no page mapped in this test — add it`);
    assert.ok(fs.existsSync(page), `${href} maps to ${page}, which does not exist`);
    const body = fs.readFileSync(page, 'utf8');
    assert.ok(
      /<PageAttention\b/.test(body) || /<AttentionPanel\b/.test(body),
      `${page} is the destination for a red dot (${href}) but renders neither ` +
        '<PageAttention> nor <AttentionPanel>, so following the dot lands on a ' +
        'page that never says what is missing',
    );
  }

  // Overview is the checklist home and must always carry the full list.
  const overview = fs.readFileSync(PAGE_FOR['/building'], 'utf8');
  assert.ok(/<AttentionPanel\b/.test(overview), 'Overview no longer renders the checklist');
}

console.log('building attention: all assertions passed');
