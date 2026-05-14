import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const Body = z.object({
  code: z.string().min(3).max(64),
});

/**
 * Links the signed-in user as the referred party for a referral invite code (e.g. from ?ref= on signup).
 */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const raw = parsed.data.code.trim();
  if (!raw) return NextResponse.json({ error: 'missing code' }, { status: 400 });

  const sb = supabaseServer();
  const { data: portals } = await sb.from('profile_portals').select('portal').eq('profile_id', session.user.id);
  const portalList = (portals ?? []).map((p: { portal: string }) => p.portal);
  if (!portalList.includes('resident')) {
    return NextResponse.json({ error: 'resident portal required' }, { status: 403 });
  }

  const admin = supabaseAdmin();
  let row = await admin
    .from('referrals')
    .select('id, referrer_profile_id, referred_profile_id')
    .eq('code', raw)
    .maybeSingle()
    .then((r) => r.data);

  if (!row) {
    row = await admin
      .from('referrals')
      .select('id, referrer_profile_id, referred_profile_id')
      .ilike('code', raw)
      .maybeSingle()
      .then((r) => r.data);
  }

  if (!row) return NextResponse.json({ error: 'unknown referral code' }, { status: 404 });

  if (row.referrer_profile_id === session.user.id) {
    return NextResponse.json({ error: 'cannot refer yourself' }, { status: 400 });
  }
  if (row.referred_profile_id && row.referred_profile_id !== session.user.id) {
    return NextResponse.json({ error: 'code already used' }, { status: 409 });
  }

  await admin
    .from('referrals')
    .update({
      referred_profile_id: session.user.id,
      fulfilled_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  return NextResponse.json({ ok: true });
}
