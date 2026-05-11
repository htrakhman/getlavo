import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = supabaseServer();
  const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: target } = await admin.from('profiles').select('email, role').eq('id', userId).maybeSingle();
  if (!target) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const dest =
    target.role === 'building_manager' ? '/building'
    : target.role === 'operator' ? '/operator'
    : '/resident/washes';

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: target.email,
    options: { redirectTo: `${appUrl}${dest}` },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    actorId: session.user.id,
    actorRole: 'admin',
    action: 'admin.impersonate',
    entityType: 'profile',
    entityId: userId,
    metadata: { email: target.email },
  });

  return NextResponse.json({ url: link.properties.action_link });
}
