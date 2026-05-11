import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = supabaseServer();
  await sb.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('id', params.id).eq('recipient_id', session.user.id);
  return NextResponse.json({ success: true });
}
