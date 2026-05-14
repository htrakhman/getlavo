import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { randomShareToken } from '@/lib/building-candidate';

export async function POST() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const code = `REF-${randomShareToken(10)}`;
  const admin = supabaseAdmin();
  const { error } = await admin.from('referrals').insert({
    referrer_profile_id: session.user.id,
    code,
    credit_cents_each: 1000,
    role: 'resident',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.json({ code, url: `${origin}/signup?role=resident&ref=${encodeURIComponent(code)}` });
}
