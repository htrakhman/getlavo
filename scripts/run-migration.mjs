import { readFileSync } from 'node:fs';
import pg from 'pg';

const password = process.env.PGPASSWORD;
if (!password) { console.error('PGPASSWORD env required'); process.exit(1); }

const sql = readFileSync(new URL('../supabase/migrations/_apply_now.sql', import.meta.url), 'utf8');

const candidates = [
  `postgresql://postgres.rrklsrgcaenyvmifjnog:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.rrklsrgcaenyvmifjnog:${encodeURIComponent(password)}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.rrklsrgcaenyvmifjnog:${encodeURIComponent(password)}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres:${encodeURIComponent(password)}@db.rrklsrgcaenyvmifjnog.supabase.co:5432/postgres`,
];

let client;
for (const url of candidates) {
  client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    console.log('Trying', url.replace(/:[^@]+@/, ':****@'));
    await client.connect();
    console.log('Connected!');
    break;
  } catch (e) {
    console.log('  failed:', e.message);
    client = null;
  }
}
if (!client) { console.error('Could not connect to any host'); process.exit(2); }

try {
  await client.query('begin');
  await client.query(sql);
  await client.query('commit');
  console.log('Migration applied successfully');
} catch (e) {
  await client.query('rollback').catch(()=>{});
  console.error('Migration failed:', e.message);
  console.error(e);
  process.exit(3);
} finally {
  await client.end();
}
