import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const MIN_PRE = 1;
const MIN_POST = 1;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = supabaseServer();
  const { data: op } = await sb.from('operators').select('id').eq('owner_id', session.user.id).maybeSingle();
  if (!op) return NextResponse.json({ error: 'no operator' }, { status: 403 });

  const admin = supabaseAdmin();
  const { data: booking } = await admin
    .from('bookings')
    .select('id, operator_id, status, pre_wash_photo_urls, post_wash_photo_urls')
    .eq('id', params.id)
    .maybeSingle();
  if (!booking || booking.operator_id !== op.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  if (!['confirmed', 'in_progress'].includes(booking.status)) {
    return NextResponse.json({ error: 'booking cannot be completed from this status' }, { status: 400 });
  }

  const pre = Array.isArray(booking.pre_wash_photo_urls) ? (booking.pre_wash_photo_urls as string[]).length : 0;
  const post = Array.isArray(booking.post_wash_photo_urls) ? (booking.post_wash_photo_urls as string[]).length : 0;
  if (pre < MIN_PRE || post < MIN_POST) {
    return NextResponse.json(
      { error: `Add at least ${MIN_PRE} pre-wash and ${MIN_POST} post-wash photos before completing.` },
      { status: 400 },
    );
  }

  await admin
    .from('bookings')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', params.id);

  return NextResponse.json({ ok: true });
}
