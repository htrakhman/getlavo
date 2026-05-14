import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loadWashForOperator } from '@/lib/auth/wash-ownership';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('photo');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no photo' }, { status: 400 });

  const admin = supabaseAdmin();
  const check = await loadWashForOperator(admin, params.id, session.user.id);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = `${check.ctx.washDayId}/${check.ctx.washId}.jpg`;

  const { error: upErr } = await admin.storage.from('wash-photos').upload(path, bytes, {
    contentType: file.type || 'image/jpeg',
    upsert: true,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from('wash-photos').getPublicUrl(path);
  await admin.from('washes').update({ photo_url: publicUrl }).eq('id', params.id);

  return NextResponse.json({ photoUrl: publicUrl });
}
