import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const Body = z.object({ slug: z.string().min(1).max(120) });

/**
 * Attaches the signed-in user's resident record to the building identified by
 * slug (QR funnel building switch). If they have no resident record yet, the
 * client should send them through resident onboarding instead.
 */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: building } = await admin
    .from('buildings')
    .select('id')
    .eq('slug', parsed.data.slug)
    .in('status', ['prospect', 'pilot', 'active'])
    .maybeSingle();
  if (!building) return NextResponse.json({ error: 'Building not found' }, { status: 404 });

  const { data: resident } = await admin
    .from('residents')
    .select('id, building_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();

  if (!resident) return NextResponse.json({ needsOnboarding: true });
  if (resident.building_id === building.id) return NextResponse.json({ ok: true });

  const { error } = await admin
    .from('residents')
    .update({ building_id: building.id })
    .eq('id', resident.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
