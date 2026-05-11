import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { audit } from '@/lib/audit';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rl = rateLimit(`delete-request:${session.user.id}:${clientIp(req)}`, { limit: 3, windowMs: 60 * 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const { reason } = await req.json().catch(() => ({}));

  // We don't auto-delete (would lose accounting). Email admin and audit-log.
  if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
        to: process.env.ADMIN_EMAIL,
        subject: 'Account deletion request',
        html: `<p>User ${session.profile.email} (${session.user.id}) requested account deletion.</p><p>Reason: ${reason ?? '—'}</p>`,
      });
    } catch {}
  }

  await audit({
    actorId: session.user.id,
    actorRole: session.profile.role,
    action: 'account.delete_request',
    entityType: 'profile',
    entityId: session.user.id,
    metadata: reason ? { reason } : undefined,
  });

  return NextResponse.json({ success: true });
}
