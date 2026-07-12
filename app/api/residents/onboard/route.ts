import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const Body = z.object({
  buildingId: z.string().uuid(),
  unitNumber: z.string().min(1),
  floorNumber: z.number().int(),
  spotLabel: z.string().nullable().optional(),
  vehicleAccessMethod: z.string().nullable().optional(),
  vehicleAccessNotes: z.string().nullable().optional(),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int(),
  color: z.string().min(1),
  plate: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const {
    buildingId, unitNumber, floorNumber, spotLabel,
    vehicleAccessMethod, vehicleAccessNotes,
    make, model, year, color, plate, photoUrl,
  } = parsed.data;

  const admin = supabaseAdmin();
  const profileId = session.user.id;

  // Ensure the profiles row exists — the handle_new_user trigger fires on INSERT into
  // auth.users, but in edge cases (trigger lag, Google OAuth timing) it can miss.
  // Without this row the residents FK fails with a 23503 constraint error.
  const { error: profileErr } = await admin
    .from('profiles')
    .upsert({ id: profileId, email: session.user.email ?? '' }, { onConflict: 'id', ignoreDuplicates: true });
  if (profileErr) {
    console.error('[onboard] profile upsert failed:', profileErr.message, profileErr.details);
  }

  // Upsert resident row — admin client bypasses RLS so this always works
  const { data: existing } = await admin
    .from('residents')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  const residentPayload: Record<string, unknown> = {
    building_id: buildingId,
    unit_number: unitNumber,
    floor_number: floorNumber,
    spot_label: spotLabel ?? null,
    vehicle_access_method: vehicleAccessMethod ?? null,
    vehicle_access_notes: vehicleAccessNotes ?? null,
  };

  let residentId: string;

  if (existing?.id) {
    const { data, error } = await admin
      .from('residents')
      .update(residentPayload)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) {
      console.error('[onboard] resident UPDATE failed (will retry without access fields):', error.message, error.details);
      // Retry without access fields in case column doesn't exist yet
      const { vehicle_access_method: _m, vehicle_access_notes: _n, ...base } = residentPayload;
      const { data: d2, error: e2 } = await admin
        .from('residents')
        .update(base)
        .eq('id', existing.id)
        .select('id')
        .single();
      if (e2) {
        console.error('[onboard] resident UPDATE fallback failed:', e2.message, e2.details);
        return NextResponse.json({ error: e2.message }, { status: 500 });
      }
      residentId = d2!.id;
    } else {
      residentId = data!.id;
    }
  } else {
    const { data, error } = await admin
      .from('residents')
      .insert({ profile_id: profileId, ...residentPayload })
      .select('id')
      .single();
    if (error) {
      console.error('[onboard] resident INSERT failed (will retry without access fields):', error.message, error.details);
      const { vehicle_access_method: _m, vehicle_access_notes: _n, ...base } = residentPayload;
      const { data: d2, error: e2 } = await admin
        .from('residents')
        .insert({ profile_id: profileId, ...base })
        .select('id')
        .single();
      if (e2) {
        console.error('[onboard] resident INSERT fallback failed:', e2.message, e2.details);
        return NextResponse.json({ error: e2.message }, { status: 500 });
      }
      residentId = d2!.id;
    } else {
      residentId = data!.id;
    }
  }

  // Upsert primary vehicle
  const { data: existingVeh } = await admin
    .from('vehicles')
    .select('id')
    .eq('resident_id', residentId)
    .maybeSingle();

  const vehiclePayload: Record<string, unknown> = {
    resident_id: residentId,
    license_plate: plate || 'UNKNOWN',
    make,
    model,
    year,
    color,
    is_primary: true,
    photo_url: photoUrl ?? null,
  };

  if (existingVeh?.id) {
    const { error: vehErr } = await admin.from('vehicles').update(vehiclePayload).eq('id', existingVeh.id);
    if (vehErr) {
      console.error('[onboard] vehicle UPDATE failed (will retry without photo_url):', vehErr.message, vehErr.details);
      const { photo_url: _p, ...vehBase } = vehiclePayload;
      const { error: vehErr2 } = await admin.from('vehicles').update(vehBase).eq('id', existingVeh.id);
      if (vehErr2) console.error('[onboard] vehicle UPDATE fallback failed:', vehErr2.message, vehErr2.details);
    }
  } else {
    const { error: vehErr } = await admin.from('vehicles').insert(vehiclePayload);
    if (vehErr) {
      console.error('[onboard] vehicle INSERT failed (will retry without photo_url):', vehErr.message, vehErr.details);
      const { photo_url: _p, ...vehBase } = vehiclePayload;
      const { error: vehErr2 } = await admin.from('vehicles').insert(vehBase);
      if (vehErr2) console.error('[onboard] vehicle INSERT fallback failed:', vehErr2.message, vehErr2.details);
    }
  }

  console.log('[onboard] SUCCESS residentId:', residentId, 'profileId:', profileId);
  return NextResponse.json({ ok: true });
}
