import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const category = typeof body.category === 'string' ? body.category : 'other';
  const description = typeof body.description === 'string' ? body.description : '';
  const bookingId = typeof body.bookingId === 'string' ? body.bookingId : null;
  const photos = Array.isArray(body.photoUrls) ? body.photoUrls : [];

  if (description.length < 10) return NextResponse.json({ error: 'Please describe what happened' }, { status: 400 });

  const sb = supabaseServer();
  const { data: resident } = await sb
    .from('residents')
    .select('id, building_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident?.building_id) return NextResponse.json({ error: 'no building' }, { status: 400 });

  const admin = supabaseAdmin();
  const { error } = await admin.from('issues').insert({
    building_id: resident.building_id,
    reporter_id: session.user.id,
    type: 'resident_claim',
    description,
    status: 'open',
    category,
    photo_urls: photos,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
