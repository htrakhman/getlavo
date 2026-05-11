import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { rating, comment } = await req.json();
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'invalid rating' }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data: resident } = await sb.from('residents').select('id').eq('profile_id', session.user.id).maybeSingle();
  if (!resident) return NextResponse.json({ error: 'no resident' }, { status: 404 });

  const admin = supabaseAdmin();
  const { data: wash } = await admin
    .from('washes')
    .select('id, resident_id, wash_day:wash_days(operator_id, partnership_id)')
    .eq('id', params.id)
    .maybeSingle();
  if (!wash || wash.resident_id !== resident.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const operatorId = (wash.wash_day as any)?.operator_id;
  if (!operatorId) return NextResponse.json({ error: 'no operator' }, { status: 400 });

  await admin.from('wash_reviews').upsert({
    wash_id: params.id,
    resident_id: resident.id,
    operator_id: operatorId,
    rating,
    comment: comment || null,
  }, { onConflict: 'wash_id' });

  // Recompute operator rating aggregate
  const { data: rows } = await admin.from('wash_reviews').select('rating').eq('operator_id', operatorId);
  const count = rows?.length ?? 0;
  const avg = count ? rows!.reduce((s, r) => s + r.rating, 0) / count : 0;
  await admin.from('operators').update({
    rating_avg: Number(avg.toFixed(2)),
    rating_count: count,
  }).eq('id', operatorId);

  return NextResponse.json({ success: true });
}
