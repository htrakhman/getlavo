import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ items: [] });

  const sb = supabaseServer();
  const { data } = await sb
    .from('notifications')
    .select('id, kind, title, body, link, read_at, created_at')
    .eq('recipient_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  return NextResponse.json({ items: data ?? [] });
}
