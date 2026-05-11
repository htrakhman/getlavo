// Run with: tsx scripts/setup-storage.ts
// Creates the storage buckets the app expects.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const BUCKETS = [
  { id: 'wash-photos', public: true },
  { id: 'insurance-docs', public: false },
  { id: 'contracts', public: false },
  { id: 'qr-codes', public: true },
];

async function main() {
  const { data: existing } = await sb.storage.listBuckets();
  const have = new Set((existing ?? []).map((b) => b.id));
  for (const b of BUCKETS) {
    if (have.has(b.id)) {
      console.log(`✓ ${b.id} (exists)`);
      continue;
    }
    const { error } = await sb.storage.createBucket(b.id, { public: b.public });
    if (error) console.error(`✗ ${b.id}:`, error.message);
    else console.log(`+ ${b.id} (created)`);
  }
}
main();
