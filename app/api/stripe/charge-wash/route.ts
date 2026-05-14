import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loadWashForOperator } from '@/lib/auth/wash-ownership';
import { chargeWash } from '@/lib/stripe/charge-wash';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { washRecordId } = await req.json().catch(() => ({}));
  if (!washRecordId || typeof washRecordId !== 'string') {
    return NextResponse.json({ error: 'washRecordId required' }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const ownership = await loadWashForOperator(admin, washRecordId, session.user.id);
  if (!ownership.ok) return NextResponse.json({ error: ownership.error }, { status: ownership.status });

  const result = await chargeWash(admin, washRecordId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ paymentIntentId: result.paymentIntentId, status: result.status });
}
