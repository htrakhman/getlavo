import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Stub for Checkr (or similar) background-check webhooks — verify signature in production.
 */
export async function POST(req: Request) {
  const secret = process.env.CHECKR_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get('checkr-signature') ?? req.headers.get('x-checkr-signature');
    if (!sig) return NextResponse.json({ error: 'missing signature' }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const candidateId = (payload.candidate_id as string) || (payload.data as any)?.object?.id;
  if (candidateId && typeof candidateId === 'string') {
    await supabaseAdmin()
      .from('operators')
      .update({ background_check_status: 'complete' })
      .eq('checkr_candidate_id', candidateId);
  }

  return NextResponse.json({ ok: true });
}
