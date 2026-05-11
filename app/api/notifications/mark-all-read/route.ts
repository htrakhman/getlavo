import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';

export async function POST() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = supabaseServer();
  await sb.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('recipient_id', session.user.id).is('read_at', null);
  return NextResponse.json({ success: true });
}
