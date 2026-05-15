#!/usr/bin/env node
/**
 * Backfill google_place_id for buildings registered before the onboarding
 * form captured it.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GOOGLE_PLACES_API_KEY=... \
 *     node scripts/backfill-google-place-ids.mjs
 *
 * For each building with google_place_id IS NULL, the script:
 *   1. Builds a text query from (name, address_line1, city, region, postal_code)
 *   2. Calls Google Places Text Search API
 *   3. Updates the row with the best-match placeId
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !GOOGLE_API_KEY) {
  console.error('Missing required env vars: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLACES_API_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data: buildings, error } = await sb
  .from('buildings')
  .select('id, name, address_line1, city, region, postal_code')
  .is('google_place_id', null)
  .not('address_line1', 'is', null);

if (error) { console.error('Fetch error:', error.message); process.exit(1); }
if (!buildings?.length) { console.log('No buildings need backfill.'); process.exit(0); }

console.log(`Found ${buildings.length} building(s) to backfill.\n`);

for (const b of buildings) {
  const query = [b.name, b.address_line1, b.city, b.region, b.postal_code]
    .filter(Boolean).join(', ');

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
    });

    const data = await res.json();
    const place = data.places?.[0];

    if (!place?.id) {
      console.log(`  [SKIP] ${b.name} — no Google match for: ${query}`);
      continue;
    }

    const placeId = place.id.replace(/^places\//, '');
    const { error: ue } = await sb
      .from('buildings')
      .update({ google_place_id: placeId })
      .eq('id', b.id);

    if (ue) {
      console.log(`  [ERR]  ${b.name} — update failed: ${ue.message}`);
    } else {
      console.log(`  [OK]   ${b.name} → ${placeId}`);
      console.log(`         ${place.formattedAddress ?? ''}`);
    }
  } catch (e) {
    console.log(`  [ERR]  ${b.name} — ${e}`);
  }

  await new Promise((r) => setTimeout(r, 200)); // stay under 5 req/s
}

console.log('\nDone.');
