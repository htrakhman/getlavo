/**
 * GetGleam marketplace seed — creates 10 sample car-wash operators (crews)
 * spread around the Hoboken / NYC metro so they appear in the building portal
 * marketplace.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-marketplace.mjs
 *
 * Re-running is safe: it upserts on the email/slug, so you can edit and re-run.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const CREWS = [
  {
    slug: 'gleam-mobile-detailing',
    name: 'Gleam Mobile Detailing',
    full_name: 'Jordan Kim',
    email: 'crew-gleam@demo.getgleam.app',
    description: 'Hoboken-based mobile detail crew. Eco-friendly waterless wash, ceramic spray, and interior shampoo. Servicing buildings across Hudson County since 2019.',
    base_price_cents: 2900,
    open_slot_price_cents: 4500,
    lat: 40.7440, lng: -74.0324,           // Hoboken
    service_radius_miles: 12,
    capacity_per_day: 30,
    rating_avg: 4.9, rating_count: 142,
    addons: [['Interior vacuum', 1500], ['Ceramic spray', 2500], ['Tire shine', 800]],
  },
  {
    slug: 'jersey-shine-co',
    name: 'Jersey Shine Co.',
    full_name: 'Marcus Bell',
    email: 'crew-jerseyshine@demo.getgleam.app',
    description: 'Family-run since 2014. Two-truck crew, hot-water pressure rinse, hand wax. Serves Jersey City, Hoboken, and Weehawken.',
    base_price_cents: 2500,
    open_slot_price_cents: 3800,
    lat: 40.7178, lng: -74.0431,           // Jersey City
    service_radius_miles: 10,
    capacity_per_day: 24,
    rating_avg: 4.7, rating_count: 89,
    addons: [['Hand wax', 2000], ['Tire shine', 700]],
  },
  {
    slug: 'hudson-hand-wash',
    name: 'Hudson Hand Wash',
    full_name: 'Priya Shah',
    email: 'crew-hudson@demo.getgleam.app',
    description: 'Premium hand-wash only — no machines, no brushes. Microfiber dry, leather conditioner add-on. Booking up fast in the West Village & Tribeca.',
    base_price_cents: 3500,
    open_slot_price_cents: 5500,
    lat: 40.7308, lng: -74.0086,           // Lower Manhattan
    service_radius_miles: 8,
    capacity_per_day: 16,
    rating_avg: 4.95, rating_count: 211,
    addons: [['Leather conditioner', 1800], ['Engine bay clean', 3000]],
  },
  {
    slug: 'bayonne-bubbles',
    name: 'Bayonne Bubbles',
    full_name: 'Tony Russo',
    email: 'crew-bayonne@demo.getgleam.app',
    description: 'Affordable, fast, reliable. 15-minute exterior wash and we are out of your garage. Perfect for buildings that want a no-fuss weekly partner.',
    base_price_cents: 1900,
    open_slot_price_cents: 2900,
    lat: 40.6687, lng: -74.1143,           // Bayonne
    service_radius_miles: 14,
    capacity_per_day: 40,
    rating_avg: 4.5, rating_count: 56,
    addons: [['Tire shine', 600]],
  },
  {
    slug: 'manhattan-mobile-wash',
    name: 'Manhattan Mobile Wash',
    full_name: 'Devon Park',
    email: 'crew-manhattan@demo.getgleam.app',
    description: 'High-rise specialists. We do garages from FiDi to UWS. Flat-rate building days, on-demand interior detail available 7 days a week.',
    base_price_cents: 3200,
    open_slot_price_cents: 4800,
    lat: 40.7831, lng: -73.9712,           // UES
    service_radius_miles: 9,
    capacity_per_day: 35,
    rating_avg: 4.8, rating_count: 167,
    addons: [['Interior detail', 4500], ['Pet hair removal', 2000], ['Headlight restoration', 3500]],
  },
  {
    slug: 'green-suds-eco-wash',
    name: 'Green Suds Eco Wash',
    full_name: 'Lina Park',
    email: 'crew-greensuds@demo.getgleam.app',
    description: 'Biodegradable soaps, water-reclamation pads, zero runoff. LEED-friendly buildings love us. Optional carbon-offset add-on.',
    base_price_cents: 3000,
    open_slot_price_cents: 4200,
    lat: 40.7589, lng: -73.9851,           // Midtown
    service_radius_miles: 11,
    capacity_per_day: 22,
    rating_avg: 4.85, rating_count: 78,
    addons: [['Carbon-offset wash', 500], ['Interior vacuum', 1500]],
  },
  {
    slug: 'newark-detail-crew',
    name: 'Newark Detail Crew',
    full_name: 'Carlos Mendez',
    email: 'crew-newark@demo.getgleam.app',
    description: 'Three-person crews that knock out 50+ cars on a building day. Best value per wash in Essex and southern Hudson counties.',
    base_price_cents: 2200,
    open_slot_price_cents: 3500,
    lat: 40.7357, lng: -74.1724,           // Newark
    service_radius_miles: 18,
    capacity_per_day: 55,
    rating_avg: 4.6, rating_count: 124,
    addons: [['Interior vacuum', 1200], ['Tire shine', 700]],
  },
  {
    slug: 'brooklyn-buff-detail',
    name: 'Brooklyn Buff & Detail',
    full_name: 'Jamal Foster',
    email: 'crew-brooklyn@demo.getgleam.app',
    description: 'Hand polish + paint correction specialists. We do the careful stuff — Teslas, EVs, vintage paint. Building days available Tue/Thu.',
    base_price_cents: 3800,
    open_slot_price_cents: 6500,
    lat: 40.6782, lng: -73.9442,           // Brooklyn
    service_radius_miles: 10,
    capacity_per_day: 14,
    rating_avg: 4.95, rating_count: 98,
    addons: [['Paint correction', 9500], ['Ceramic coat (1yr)', 12000], ['Interior detail', 4500]],
  },
  {
    slug: 'queensboro-quick-wash',
    name: 'Queensboro Quick Wash',
    full_name: 'Aisha Rahman',
    email: 'crew-queensboro@demo.getgleam.app',
    description: 'In-and-out service tailored for high-volume garages. We are the fastest crew on the platform — averaging 7 minutes per vehicle.',
    base_price_cents: 2000,
    open_slot_price_cents: 3000,
    lat: 40.7505, lng: -73.9370,           // LIC
    service_radius_miles: 13,
    capacity_per_day: 60,
    rating_avg: 4.4, rating_count: 203,
    addons: [['Tire shine', 600], ['Quick interior wipe', 800]],
  },
  {
    slug: 'liberty-luxury-detail',
    name: 'Liberty Luxury Detail',
    full_name: 'Sophia Chen',
    email: 'crew-liberty@demo.getgleam.app',
    description: 'White-glove service for luxury and exotic vehicles. Concierge intake, hand-applied wax, leather rejuvenation. Premium buildings only.',
    base_price_cents: 4500,
    open_slot_price_cents: 7500,
    lat: 40.7128, lng: -74.0060,           // FiDi
    service_radius_miles: 15,
    capacity_per_day: 10,
    rating_avg: 5.0, rating_count: 64,
    addons: [['Leather rejuvenation', 4000], ['Hand wax', 3000], ['Engine bay detail', 4500], ['Interior detail', 6000]],
  },
];

const HOURS = {
  mon: { open: '08:00', close: '18:00' },
  tue: { open: '08:00', close: '18:00' },
  wed: { open: '08:00', close: '18:00' },
  thu: { open: '08:00', close: '18:00' },
  fri: { open: '08:00', close: '18:00' },
  sat: { open: '09:00', close: '16:00' },
  sun: null,
};

async function ensureAuthUser(email, full_name) {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: 'Demo1234!',
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (!error) return data.user.id;
  if (!String(error.message).toLowerCase().includes('already')) throw error;
  // Find existing
  let page = 1;
  while (true) {
    const { data: list, error: listErr } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (listErr) throw listErr;
    const found = list.users.find((u) => u.email === email);
    if (found) return found.id;
    if (list.users.length < 1000) throw new Error(`User ${email} not found after create-conflict`);
    page += 1;
  }
}

async function main() {
  for (const c of CREWS) {
    const ownerId = await ensureAuthUser(c.email, c.full_name);

    await sb.from('profiles').upsert({
      id: ownerId,
      role: 'operator',
      full_name: c.full_name,
      email: c.email,
    }, { onConflict: 'id' });

    await sb.from('profile_portals').upsert(
      { profile_id: ownerId, portal: 'operator' },
      { onConflict: 'profile_id,portal' },
    );

    const { data: op, error: opErr } = await sb.from('operators').upsert({
      owner_id: ownerId,
      slug: c.slug,
      name: c.name,
      description: c.description,
      base_price_cents: c.base_price_cents,
      open_slot_price_cents: c.open_slot_price_cents,
      lat: c.lat,
      lng: c.lng,
      service_radius_miles: c.service_radius_miles,
      capacity_per_day: c.capacity_per_day,
      hours_json: HOURS,
      rating_avg: c.rating_avg,
      rating_count: c.rating_count,
      status: 'approved',
      stripe_onboarding_complete: true,
    }, { onConflict: 'slug' }).select().single();

    if (opErr) throw opErr;

    if (c.addons?.length) {
      const rows = c.addons.map(([label, price_cents]) => ({
        operator_id: op.id,
        label,
        price_cents,
        active: true,
      }));
      const { error: aErr } = await sb.from('operator_addons').upsert(rows, { onConflict: 'operator_id,label' });
      if (aErr && !String(aErr.message).includes('no unique')) {
        // Fallback: delete + insert if no unique constraint on (operator_id,label)
        await sb.from('operator_addons').delete().eq('operator_id', op.id);
        await sb.from('operator_addons').insert(rows);
      }
    }

    console.log(`✓ ${c.name}  (${c.rating_avg}★ · ${c.rating_count} reviews)`);
  }

  console.log(`\n✅ Seeded ${CREWS.length} crews. Visit /building/marketplace to see them.`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});
