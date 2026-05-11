import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// Twilio sends an x-www-form-urlencoded POST. We read From + Body to handle STOP / START.
export async function POST(req: Request) {
  const rl = rateLimit(`sms-inbound:${clientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return new NextResponse('', { status: 429 });

  const form = await req.formData();
  const from = String(form.get('From') ?? '').trim();
  const body = String(form.get('Body') ?? '').trim().toLowerCase();
  if (!from) return twiml('');

  const sb = supabaseAdmin();

  if (['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'].includes(body)) {
    await sb.from('sms_optouts').upsert({ phone: from, reason: body }, { onConflict: 'phone' });
    return twiml('You have been unsubscribed from Lavo SMS. Reply START to opt back in.');
  }
  if (['start', 'unstop', 'yes'].includes(body)) {
    await sb.from('sms_optouts').delete().eq('phone', from);
    return twiml('You\'re subscribed to Lavo alerts. Msg & data rates may apply.');
  }
  if (body === 'help') {
    return twiml('Lavo: in-garage car wash alerts. Reply STOP to unsubscribe. Help: hello@getlavo.io');
  }

  return twiml('');
}

function twiml(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${message ? `<Message>${escapeXml(message)}</Message>` : ''}</Response>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } });
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}
