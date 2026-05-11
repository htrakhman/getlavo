import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const form = await req.formData();
  const file = form.get('photo');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no photo' }, { status: 400 });

  const sb = supabaseAdmin();

  const { data: wash } = await sb.from('washes').select('id, wash_day_id').eq('id', params.id).maybeSingle();
  if (!wash) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = `${wash.wash_day_id}/${wash.id}.jpg`;

  const { error: upErr } = await sb.storage.from('wash-photos').upload(path, bytes, {
    contentType: file.type || 'image/jpeg',
    upsert: true,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: { publicUrl } } = sb.storage.from('wash-photos').getPublicUrl(path);
  await sb.from('washes').update({ photo_url: publicUrl }).eq('id', params.id);

  return NextResponse.json({ photoUrl: publicUrl });
}
