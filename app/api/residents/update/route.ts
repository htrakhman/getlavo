import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const Body = z.object({
  spotLabel: z.string().max(80).nullable().optional(),
  vehicleAccessMethod: z.string().max(40).nullable().optional(),
  vehicleAccessNotes: z.string().max(2000).nullable().optional(),
});

// Server-side save for the resident spot / vehicle-access editors. Browser-side
// RLS writes were silently matching zero rows in production.
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const b = parsed.data;

  const patch: Record<string, unknown> = {};
  if (b.spotLabel !== undefined) patch.spot_label = b.spotLabel;
  if (b.vehicleAccessMethod !== undefined) patch.vehicle_access_method = b.vehicleAccessMethod;
  if (b.vehicleAccessNotes !== undefined) patch.vehicle_access_notes = b.vehicleAccessNotes;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: updated, error } = await admin
    .from('residents')
    .update(patch)
    .eq('profile_id', session.user.id)
    .select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: 'No resident profile found — complete onboarding first' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
