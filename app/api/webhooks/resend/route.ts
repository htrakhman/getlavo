import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { logError } from '@/lib/error-log';

// Resend signs webhooks via Svix. When RESEND_WEBHOOK_SECRET is set we verify
// the signature; missing or mismatched signatures get rejected.
// See https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
async function verifySvix(req: Request, body: string): Promise<boolean> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true; // verification disabled

  const id = req.headers.get('svix-id');
  const timestamp = req.headers.get('svix-timestamp');
  const sigHeader = req.headers.get('svix-signature');
  if (!id || !timestamp || !sigHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 5 * 60) return false;

  const key = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice('whsec_'.length), 'base64')
    : Buffer.from(secret, 'utf8');
  const signed = `${id}.${timestamp}.${body}`;
  const expected = crypto.createHmac('sha256', key).update(signed).digest('base64');

  return sigHeader.split(' ').some((part) => {
    const [, sig] = part.split(',');
    if (!sig) return false;
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  if (!(await verifySvix(req, body))) {
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 });
  }

  let event: any = {};
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type: string = event?.type ?? '';
  const data = event?.data ?? {};
  const to: string = data?.to?.[0] ?? data?.to ?? '';

  if (['email.bounced', 'email.complained', 'email.failed'].includes(type)) {
    await logError({
      source: `resend:${type}`,
      message: `${to} ${type}`,
      context: data,
    });
  }

  return NextResponse.json({ ok: true });
}
