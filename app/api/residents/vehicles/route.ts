import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const VehicleFields = z.object({
  make: z.string().min(1).max(80),
  model: z.string().min(1).max(80),
  year: z.number().int().nullable().optional(),
  color: z.string().max(40).optional(),
  plate: z.string().max(20).nullable().optional(),
});

async function ownedResident(userId: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from('residents')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function assertVehicleOwned(vehicleId: string, residentId: string) {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from('vehicles')
    .select('id')
    .eq('id', vehicleId)
    .eq('resident_id', residentId)
    .maybeSingle();
  return !!data;
}

// Server-side vehicle CRUD for the resident vehicle page. Browser-side RLS
// writes were silently failing in production ("+ Add vehicle" did nothing).
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = VehicleFields.extend({ isPrimary: z.boolean().optional() }).safeParse(
    await req.json().catch(() => ({}))
  );
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const b = parsed.data;

  let residentId: string | null;
  try {
    residentId = await ownedResident(session.user.id);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  if (!residentId) return NextResponse.json({ error: 'No resident profile found — complete onboarding first' }, { status: 404 });

  const admin = supabaseAdmin();
  const { error } = await admin.from('vehicles').insert({
    resident_id: residentId,
    make: b.make,
    model: b.model,
    year: b.year ?? null,
    color: b.color ?? 'White',
    license_plate: b.plate || 'UNKNOWN',
    is_primary: !!b.isPrimary,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = z
    .object({ id: z.string().uuid(), makePrimary: z.boolean().optional() })
    .and(VehicleFields.partial())
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const b = parsed.data;

  let residentId: string | null;
  try {
    residentId = await ownedResident(session.user.id);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  if (!residentId) return NextResponse.json({ error: 'No resident profile found' }, { status: 404 });
  if (!(await assertVehicleOwned(b.id, residentId))) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }

  const admin = supabaseAdmin();

  if (b.makePrimary) {
    const { error: clearErr } = await admin
      .from('vehicles')
      .update({ is_primary: false })
      .eq('resident_id', residentId);
    if (clearErr) return NextResponse.json({ error: clearErr.message }, { status: 500 });
    const { error: setErr } = await admin.from('vehicles').update({ is_primary: true }).eq('id', b.id);
    if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const patch: Record<string, unknown> = {};
  if (b.make !== undefined) patch.make = b.make;
  if (b.model !== undefined) patch.model = b.model;
  if (b.year !== undefined) patch.year = b.year;
  if (b.color !== undefined) patch.color = b.color;
  if (b.plate !== undefined) patch.license_plate = b.plate || 'UNKNOWN';
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { error } = await admin.from('vehicles').update(patch).eq('id', b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = z.object({ id: z.string().uuid() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  let residentId: string | null;
  try {
    residentId = await ownedResident(session.user.id);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  if (!residentId) return NextResponse.json({ error: 'No resident profile found' }, { status: 404 });
  if (!(await assertVehicleOwned(parsed.data.id, residentId))) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin().from('vehicles').delete().eq('id', parsed.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
