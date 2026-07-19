/**
 * Seeds the Gomes Group buildings for the QR landing funnel and connects each
 * one to its assigned operator via an active partnership.
 *
 * Source of truth: data/gomes-buildings.json (edit there, then re-run).
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-gomes-buildings.mjs
 *
 * Re-running is safe: buildings upsert on slug, and a partnership is only
 * created when the building has no active partnership yet.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const dataPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'gomes-buildings.json');
const { managerEmail, operatorSlug, buildings } = JSON.parse(readFileSync(dataPath, 'utf8'));

const { data: manager } = await sb.from('profiles').select('id').eq('email', managerEmail).maybeSingle();
if (!manager) {
  console.error(`No profile found for manager email ${managerEmail}`);
  process.exit(1);
}

const { data: operator } = await sb.from('operators').select('id, name').eq('slug', operatorSlug).maybeSingle();
if (!operator) {
  console.error(`No operator found for slug ${operatorSlug}`);
  process.exit(1);
}

for (const b of buildings) {
  const { data: building, error } = await sb
    .from('buildings')
    .upsert(
      {
        slug: b.slug,
        name: b.name,
        address_line1: b.address_line1,
        city: b.city,
        region: b.region,
        postal_code: b.postal_code,
        country: 'US',
        status: 'active',
        manager_id: manager.id,
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single();

  if (error) {
    console.error(`✗ ${b.slug}: ${error.message}`);
    continue;
  }

  const { data: existing } = await sb
    .from('partnerships')
    .select('id, operator_id')
    .eq('building_id', building.id)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    console.log(`✓ ${b.slug} (partnership already active)`);
    continue;
  }

  const { error: pErr } = await sb.from('partnerships').insert({
    building_id: building.id,
    operator_id: operator.id,
    status: 'active',
    requested_by: manager.id,
    connected_at: new Date().toISOString(),
    responded_at: new Date().toISOString(),
  });

  if (pErr) console.error(`✗ ${b.slug} partnership: ${pErr.message}`);
  else console.log(`✓ ${b.slug} → ${operator.name}`);
}

console.log('Done.');
