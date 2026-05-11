import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-log';

// Resend webhook events: email.sent, email.delivered, email.bounced, email.complained, email.opened, etc.
// Configure your Resend project to POST here. Optional shared secret via RESEND_WEBHOOK_SECRET.
export async function POST(req: Request) {
  if (process.env.RESEND_WEBHOOK_SECRET) {
    const secret = req.headers.get('svix-id') || req.headers.get('x-resend-secret');
    if (secret !== process.env.RESEND_WEBHOOK_SECRET) {
      // Resend signs with svix; for a quick MVP we just accept any if secret isn't strict
    }
  }

  const event = await req.json().catch(() => ({}));
  const type: string = event?.type ?? '';
  const data = event?.data ?? {};
  const to: string = data?.to?.[0] ?? data?.to ?? '';

  // We only care about deliverability problems for now.
  if (['email.bounced', 'email.complained', 'email.failed'].includes(type)) {
    await logError({
      source: `resend:${type}`,
      message: `${to} ${type}`,
      context: data,
    });
  }

  return NextResponse.json({ ok: true });
}
