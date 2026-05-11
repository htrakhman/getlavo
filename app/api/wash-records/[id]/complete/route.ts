import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notify } from '@/lib/notify';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseAdmin();

  const { data: wash } = await sb
    .from('washes')
    .select('id, resident_id, vehicle:vehicles(make, model, year), resident:residents(profile_id)')
    .eq('id', params.id)
    .maybeSingle();

  if (!wash) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await sb.from('washes').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', params.id);

  // Trigger Stripe charge (best-effort; charging code defined below)
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/stripe/charge-wash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ washRecordId: params.id }),
    });
  } catch {}

  const profileId = (wash.resident as any)?.profile_id;
  const v = wash.vehicle as any;
  if (profileId) {
    await notify(profileId, 'wash_complete', {
      vehicleDesc: v ? `${v.year} ${v.make} ${v.model}` : 'car',
      link: '/resident/washes',
    });
  }

  return NextResponse.json({ success: true });
}
