import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

function appendUrl(urls: unknown, url: string): string[] {
  const arr = Array.isArray(urls) ? (urls as string[]) : [];
  return [...arr, url];
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('photo');
  const kind = form.get('kind');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no photo' }, { status: 400 });
  if (kind !== 'pre' && kind !== 'post') return NextResponse.json({ error: 'invalid kind' }, { status: 400 });

  const sb = supabaseServer();
  const { data: op } = await sb.from('operators').select('id').eq('owner_id', session.user.id).maybeSingle();
  if (!op) return NextResponse.json({ error: 'no operator' }, { status: 403 });

  const admin = supabaseAdmin();
  const { data: booking } = await admin
    .from('bookings')
    .select('id, operator_id, pre_wash_photo_urls, post_wash_photo_urls')
    .eq('id', params.id)
    .maybeSingle();
  if (!booking || booking.operator_id !== op.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = `bookings/${params.id}/${kind}-${Date.now()}.jpg`;
  const { error: upErr } = await admin.storage.from('wash-photos').upload(path, bytes, {
    contentType: file.type || 'image/jpeg',
    upsert: true,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = admin.storage.from('wash-photos').getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const field = kind === 'pre' ? 'pre_wash_photo_urls' : 'post_wash_photo_urls';
  const next =
    kind === 'pre'
      ? appendUrl(booking.pre_wash_photo_urls, publicUrl)
      : appendUrl(booking.post_wash_photo_urls, publicUrl);

  await admin.from('bookings').update({ [field]: next }).eq('id', params.id);

  return NextResponse.json({ photoUrl: publicUrl });
}
