/**
 * Regression tests for lib/billing-arrangement.
 * Run: npx tsx scripts/billing-arrangement-test.ts
 *
 * This module decides who gets charged, so the cases that matter most are the
 * ones where a mistake gives a wash away free or bills someone who never
 * agreed to pay.
 */
import assert from 'node:assert';
import {
  resolveBillingSplit,
  normalizeBillingMode,
  isBillingMode,
  describeBillingArrangement,
  DEFAULT_BILLING_MODE,
  BILLING_MODES,
} from '../lib/billing-arrangement';

const WASH = 4900;

// --- occupant_pays: the original behaviour, unchanged --------------------
{
  const s = resolveBillingSplit({ mode: 'occupant_pays', washCents: WASH });
  assert.equal(s.occupantCents, WASH, 'occupant pays the full wash');
  assert.equal(s.propertyCents, 0, 'property is never charged');
  assert.equal(s.requiresPropertyCard, false, 'no card needed');
}

// --- property_pays --------------------------------------------------------
{
  const s = resolveBillingSplit({ mode: 'property_pays', washCents: WASH });
  assert.equal(s.occupantCents, 0, 'occupant books at no charge');
  assert.equal(s.propertyCents, WASH, 'property covers the whole wash');
  assert.equal(s.requiresPropertyCard, true, 'a card on file is required');
}

// --- property_subsidized --------------------------------------------------
{
  const s = resolveBillingSplit({ mode: 'property_subsidized', washCents: WASH, subsidyCents: 3000 });
  assert.equal(s.propertyCents, 3000, 'property covers the subsidy');
  assert.equal(s.occupantCents, 1900, 'occupant pays the remainder');
  assert.equal(s.occupantCents + s.propertyCents, WASH, 'the two halves must reconstruct the price');
  assert.equal(s.requiresPropertyCard, true);
}

// A subsidy larger than the wash must not produce a negative occupant charge
// or overbill the property.
{
  const s = resolveBillingSplit({ mode: 'property_subsidized', washCents: WASH, subsidyCents: 100000 });
  assert.equal(s.propertyCents, WASH, 'property is billed the wash, never more');
  assert.equal(s.occupantCents, 0, 'occupant is never handed a negative balance');
}

// A subsidy of zero degrades to the occupant paying, not to a free wash.
{
  const s = resolveBillingSplit({ mode: 'property_subsidized', washCents: WASH, subsidyCents: 0 });
  assert.equal(s.occupantCents, WASH);
  assert.equal(s.propertyCents, 0);
  assert.equal(s.requiresPropertyCard, false, 'nothing owed means no card needed');
}

// --- a free wash (fully discounted) charges nobody ------------------------
for (const mode of BILLING_MODES) {
  const s = resolveBillingSplit({ mode, washCents: 0, subsidyCents: 5000 });
  assert.equal(s.occupantCents, 0, `${mode}: nothing to charge the occupant`);
  assert.equal(s.propertyCents, 0, `${mode}: nothing to charge the property`);
  assert.equal(s.requiresPropertyCard, false, `${mode}: no card needed for a free wash`);
}

// --- hostile input must never invent a charge or a free wash --------------
{
  for (const bad of [null, undefined, -500, NaN, 'abc', {}]) {
    const s = resolveBillingSplit({ mode: 'occupant_pays', washCents: bad });
    assert.equal(s.occupantCents, 0, `wash ${String(bad)} floors at zero`);
    assert.equal(s.propertyCents, 0);
  }
  const negSubsidy = resolveBillingSplit({ mode: 'property_subsidized', washCents: WASH, subsidyCents: -900 });
  assert.equal(negSubsidy.propertyCents, 0, 'a negative subsidy covers nothing');
  assert.equal(negSubsidy.occupantCents, WASH, 'and the occupant still owes the wash');
}

// An unknown mode must fall back to the occupant paying — never to free.
{
  for (const bad of ['building_pays', '', null, undefined, 42]) {
    assert.equal(normalizeBillingMode(bad), DEFAULT_BILLING_MODE, `${String(bad)} -> default`);
    const s = resolveBillingSplit({ mode: bad, washCents: WASH });
    assert.equal(s.occupantCents, WASH, `${String(bad)} must not give the wash away`);
    assert.equal(s.propertyCents, 0);
  }
  assert.equal(isBillingMode('property_pays'), true);
  assert.equal(isBillingMode('nonsense'), false);
}

// A subsidy set on a mode that does not use one is ignored, not applied.
{
  const s = resolveBillingSplit({ mode: 'occupant_pays', washCents: WASH, subsidyCents: 3000 });
  assert.equal(s.occupantCents, WASH, 'a stray subsidy cannot discount an occupant-pays wash');
  assert.equal(s.propertyCents, 0);
}

// --- copy -----------------------------------------------------------------
assert.match(describeBillingArrangement('property_pays'), /property pays/i);
assert.match(describeBillingArrangement('property_subsidized', 3000), /\$30\.00/);
assert.match(describeBillingArrangement('occupant_pays'), /never charged/i);

console.log('billing-arrangement: all assertions passed');
