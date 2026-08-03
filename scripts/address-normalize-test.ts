/**
 * Regression guard for waitlist address normalization.
 * Run: npm run validate:address-normalize
 *
 * The invariant the prospecting view depends on: every way a resident might
 * type one building's address collapses to one key, and two genuinely
 * different buildings never collapse into one. The first failure understates
 * demand and buries a real prospect; the second invents a prospect that does
 * not exist.
 */

import { normalizeAddress, waitlistGroupKey } from '../lib/address-normalize';

let failures = 0;

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ok   ${label}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${label}${detail ? `\n       ${detail}` : ''}`);
}

function keysMatch(label: string, variants: string[]): void {
  const results = variants.map((v) => ({ input: v, key: normalizeAddress(v).key }));
  const distinct = [...new Set(results.map((r) => r.key))];
  check(
    label,
    distinct.length === 1 && Boolean(distinct[0]),
    distinct.length === 1
      ? 'key was empty'
      : results.map((r) => `${JSON.stringify(r.input)} -> ${r.key}`).join('\n       '),
  );
}

// ---------------------------------------------------------------------------
console.log('\nthe same building typed five different ways');
// ---------------------------------------------------------------------------
keysMatch('suffix, casing, punctuation, and unit variants collapse', [
  '123 Main St, Jersey City, NJ 07302',
  '123 Main Street, Jersey City, NJ 07302',
  '123 main st., jersey city, nj 07302',
  '123 Main St Apt 4B, Jersey City, NJ 07302',
  '123 Main Street, Unit 12, Jersey City, NJ 07302',
  '123 Main St #7, Jersey City, NJ 07302',
  '123 Main St, Jersey City, NJ 07302, USA',
]);

keysMatch('directional forms collapse', [
  '450 North Ave, Union City, NJ 07087',
  '450 N Ave, Union City, NJ 07087',
  '450 N. Avenue, Union City, NJ 07087',
]);

keysMatch('word and numeric ordinals collapse', [
  '77 First Street, Hoboken, NJ 07030',
  '77 1st St, Hoboken, NJ 07030',
  '77 1st Street, Hoboken, NJ 07030',
]);

keysMatch('floor and suite designators are dropped', [
  '1 Observer Hwy, Floor 3, Hoboken, NJ 07030',
  '1 Observer Highway Ste 200, Hoboken, NJ 07030',
  '1 Observer Hwy, Hoboken, NJ 07030',
]);

// ---------------------------------------------------------------------------
console.log('\ndifferent buildings stay separate');
// ---------------------------------------------------------------------------
{
  const distinct = [
    '123 Main St, Jersey City, NJ 07302',
    '125 Main St, Jersey City, NJ 07302',
    '123 Main Ave, Jersey City, NJ 07302',
    '123 Main St, Hoboken, NJ 07030',
    '123 N Main St, Jersey City, NJ 07302',
  ];
  const keys = distinct.map((d) => normalizeAddress(d).key);
  check(
    'five distinct addresses produce five distinct keys',
    new Set(keys).size === 5,
    keys.join('\n       '),
  );
}

{
  // Same street and number in two towns must not merge just because the ZIP is
  // absent from one of them.
  const a = normalizeAddress('50 Park Ave, Newark, NJ');
  const b = normalizeAddress('50 Park Ave, Hoboken, NJ');
  check('same street in different cities stays separate', a.key !== b.key, `${a.key} vs ${b.key}`);
}

// ---------------------------------------------------------------------------
console.log('\nstreet names that look like designators survive');
// ---------------------------------------------------------------------------
{
  const broadway = normalizeAddress('100 Broadway, Bayonne, NJ 07002');
  check('a street with no suffix keeps its number', broadway.streetNumber === '100', broadway.key);
  check('"Broadway" is not truncated', broadway.street === 'broadway', broadway.street);

  // "West" mid-name is part of the street, not a leading directional.
  const keyWest = normalizeAddress('12 Key West Ave, Edison, NJ 08817');
  check('mid-name directional is preserved', keyWest.street === 'key west ave', keyWest.street);

  // A trailing number with no suffix before it is a street name, not a unit.
  const route = normalizeAddress('1200 Route 22, Union, NJ 07083');
  check('trailing number in a street name is kept', route.street.includes('22'), route.street);
}

// ---------------------------------------------------------------------------
console.log('\nunit extraction');
// ---------------------------------------------------------------------------
{
  const withUnit = normalizeAddress('123 Main St Apt 4B, Jersey City, NJ 07302');
  check('unit is captured for display', withUnit.unit === 'apt 4b', withUnit.unit);
  check('unit is excluded from the key', !withUnit.key.includes('4b'), withUnit.key);

  const hash = normalizeAddress('88 Grand St #12, Jersey City, NJ 07302');
  check('hash-prefixed unit is captured', hash.unit === '#12', hash.unit);

  const bare = normalizeAddress('88 Grand St 12, Jersey City, NJ 07302');
  check('bare trailing unit after a suffix is dropped', bare.key === hash.key, `${bare.key} vs ${hash.key}`);
}

// ---------------------------------------------------------------------------
console.log('\nparsed fields');
// ---------------------------------------------------------------------------
{
  const parsed = normalizeAddress('450 Washington Blvd, Jersey City, NJ 07310');
  check('street number parsed', parsed.streetNumber === '450', parsed.streetNumber);
  check('suffix canonicalized to blvd', parsed.street === 'washington blvd', parsed.street);
  check('city parsed', parsed.city === 'Jersey City', parsed.city);
  check('state parsed', parsed.state === 'NJ', parsed.state);
  check('zip parsed', parsed.zip === '07310', parsed.zip);
  check(
    'normalized form is readable',
    parsed.normalized === '450 Washington Blvd, Jersey City, NJ 07310',
    parsed.normalized,
  );

  const spelled = normalizeAddress('450 Washington Boulevard, Jersey City, New Jersey 07310');
  check('spelled-out state resolves', spelled.state === 'NJ', spelled.state);
  check('spelled-out state matches abbreviated', spelled.key === parsed.key, `${spelled.key} vs ${parsed.key}`);
}

// ---------------------------------------------------------------------------
console.log('\ndegenerate input');
// ---------------------------------------------------------------------------
{
  check('empty string yields an empty key', normalizeAddress('').key === '');
  check('null yields an empty key', normalizeAddress(null).key === '');
  check('whitespace yields an empty key', normalizeAddress('   ').key === '');
  check('a bare city does not fabricate a street', normalizeAddress('Jersey City, NJ').key === '');

  const noZip = normalizeAddress('123 Main St, Jersey City, NJ');
  check('missing zip still groups on city and state', noZip.key.length > 0, noZip.key);

  const streetOnly = normalizeAddress('123 Main St');
  check('street-only input still produces a key', streetOnly.key.length > 0, streetOnly.key);
  check(
    'street-only does not collide with a located address',
    streetOnly.key !== normalizeAddress('123 Main St, Jersey City, NJ 07302').key,
  );
}

// ---------------------------------------------------------------------------
console.log('\ngroup key precedence');
// ---------------------------------------------------------------------------
{
  check(
    'a resolved building id wins over address text',
    waitlistGroupKey({ buildingId: 'b1', addressKey: 'x', candidateKey: 'y' }) === 'building:b1',
  );
  check(
    'address key is used when no building resolved',
    waitlistGroupKey({ addressKey: 'x', candidateKey: 'y' }) === 'addr:x',
  );
  check(
    'legacy candidate key is the last resort',
    waitlistGroupKey({ candidateKey: 'y' }) === 'legacy:y',
  );
  check('unknown when nothing is available', waitlistGroupKey({}) === 'unknown');

  // Two spellings that both resolved to one building must group together even
  // though their address keys differ.
  const a = waitlistGroupKey({ buildingId: 'b1', addressKey: normalizeAddress('123 Main St').key });
  const b = waitlistGroupKey({ buildingId: 'b1', addressKey: normalizeAddress('123 Main Street, Apt 9').key });
  check('same resolved building groups across spellings', a === b, `${a} vs ${b}`);
}

console.log('');
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log('All address normalization checks passed.');
