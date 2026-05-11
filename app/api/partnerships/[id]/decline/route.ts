import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('operator')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  const { data: partnership } = await sb
    .from('partnerships')
    .select('id, status, operator:operators(owner_id)')
    .eq('id', params.id)
    .eq('status', 'pending')
    .single();

  if (!partnership) return NextResponse.json({ error: 'Partnership request not found' }, { status: 404 });

  const operator = partnership.operator as any;
  if (operator.owner_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin
    .from('partnerships')
    .update({
      status: 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
