import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { wrapEmail, button, paragraph } from '@/lib/email/template';

/**
 * The building manager declines a service agreement. Marks the contract
 * cancelled and notifies the operator. Both dashboards read `status`, so the
 * agreement drops off the active list for both parties immediately.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { reason } = await req.json().catch(() => ({}));

  const admin = supabaseAdmin();

  const { data: contract } = await admin
    .from('contracts')
    .select('id, status, manager_signed_at, building:buildings(id, name, manager_id), operator:operators(id, name, contact_email)')
    .eq('id', params.id)
    .maybeSingle();
  if (!contract) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const building = contract.building as any;
  const operator = contract.operator as any;

  if (building?.manager_id !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (contract.status === 'executed') {
    return NextResponse.json({ error: 'This agreement is already fully executed and cannot be declined here.' }, { status: 400 });
  }

  const { error } = await admin
    .from('contracts')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 500) : 'Declined by building manager',
    })
    .eq('id', contract.id);
  if (error) {
    // Fall back to a status-only update if the extra columns are missing from
    // the live schema, so declining is never silently blocked.
    const { error: retryError } = await admin.from('contracts').update({ status: 'cancelled' }).eq('id', contract.id);
    if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
  }

  if (operator?.contact_email && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const link = `${process.env.NEXT_PUBLIC_APP_URL || ''}/operator/contracts`;
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
        to: operator.contact_email,
        subject: `${building.name} declined the service agreement`,
        html: wrapEmail({
          preheader: `${building.name} declined your service agreement.`,
          content: [
            paragraph(`${building.name} has declined the service agreement${typeof reason === 'string' && reason.trim() ? `: "${reason.trim().slice(0, 300)}"` : '.'}`),
            paragraph('You can send an updated agreement to another available building any time.'),
            button(link, 'View your agreements →'),
          ].join(''),
        }),
      });
    } catch {}
  }

  return NextResponse.json({ ok: true });
}
