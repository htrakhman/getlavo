import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPackagesForBuilding } from '@/lib/service-packages';
import { syncUpcomingRostersForBuilding } from '@/lib/wash-roster';
import { audit } from '@/lib/audit';
import { z } from 'zod';

// GET: the packages this resident can choose from (their building's active
// operator). ?buildingId= lets onboarding preview packages for a building
// before the resident row exists.
export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = supabaseAdmin();
  const url = new URL(req.url);
  const buildingIdParam = url.searchParams.get('buildingId');

  const { data: resident } = await admin
    .from('residents')
    .select('id, building_id, package_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();

  const buildingId = buildingIdParam ?? resident?.building_id;
  if (!buildingId) return NextResponse.json({ operatorName: null, packages: [], currentPackageId: null });

  const { operatorName, packages } = await getPackagesForBuilding(admin, buildingId);
  return NextResponse.json({ operatorName, packages, currentPackageId: resident?.package_id ?? null });
}

const Body = z.object({ packageId: z.string().uuid() });

// POST: set the resident's service package and put them on every upcoming
// wash day roster for their building.
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: resident } = await admin
    .from('residents')
    .select('id, building_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) return NextResponse.json({ error: 'no resident profile' }, { status: 403 });

  const { operatorId, packages } = await getPackagesForBuilding(admin, resident.building_id);
  const pkg = packages.find((p) => p.id === parsed.data.packageId);
  if (!operatorId || !pkg) {
    return NextResponse.json({ error: 'package not available for your building' }, { status: 400 });
  }

  const { error } = await admin
    .from('residents')
    .update({ package_id: pkg.id })
    .eq('id', resident.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await syncUpcomingRostersForBuilding(admin, resident.building_id);

  await audit({
    actorId: session.user.id,
    actorRole: 'resident',
    action: 'resident.package_selected',
    entityType: 'resident',
    entityId: resident.id,
    metadata: { packageId: pkg.id, packageName: pkg.name, priceCents: pkg.price_cents },
  });

  return NextResponse.json({ ok: true });
}
