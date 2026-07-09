import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { wrapEmail, button, paragraph } from '@/lib/email/template';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { signedName } = await req.json().catch(() => ({}));
  if (!signedName || typeof signedName !== 'string' || !signedName.trim()) {
    return NextResponse.json({ error: 'signed name required' }, { status: 400 });
  }

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  // Load contract with building + operator for ownership check
  const { data: contract } = await admin
    .from('contracts')
    .select('id, building_id, operator_id, status, manager_signed_at, operator_signed_at, building:buildings(id, name, manager_id, region, profiles!manager_id(full_name, email)), operator:operators(id, name, owner_id, contact_email)')
    .eq('id', params.id)
    .maybeSingle();

  if (!contract) return NextResponse.json({ error: 'contract not found' }, { status: 404 });

  const building = contract.building as any;
  const operator = contract.operator as any;

  const isManager = building?.manager_id === session.user.id;
  const isOperator = operator?.owner_id === session.user.id;

  if (!isManager && !isOperator) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const now = new Date().toISOString();

  // Determine which side is signing
  if (isManager) {
    if (contract.manager_signed_at) {
      return NextResponse.json({ error: 'already signed' }, { status: 400 });
    }
    const { error } = await admin.from('contracts').update({
      manager_signed_at: now,
      manager_signed_by: session.user.id,
      manager_signed_name: signedName.trim(),
      status: contract.operator_signed_at ? 'executed' : 'pending_signatures',
      ...(contract.operator_signed_at ? { fully_executed_at: now } : {}),
    }).eq('id', contract.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify operator
    if (operator?.contact_email && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const link = `${process.env.NEXT_PUBLIC_APP_URL || ''}/operator/contracts/${contract.id}`;
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
          to: operator.contact_email,
          subject: `${building.name} has signed the service agreement`,
          html: wrapEmail({
            preheader: `${building.name} signed the contract — your signature is next.`,
            content: [
              paragraph(`${building.name} has signed the Lavo service agreement. Your signature is the last step before the contract is executed.`),
              button(link, 'Review & sign →'),
            ].join(''),
          }),
        });
      } catch {}
    }
  } else {
    // Operator signing
    if (contract.operator_signed_at) {
      return NextResponse.json({ error: 'already signed' }, { status: 400 });
    }
    const { error } = await admin.from('contracts').update({
      operator_signed_at: now,
      operator_signed_by: session.user.id,
      operator_signed_name: signedName.trim(),
      status: contract.manager_signed_at ? 'executed' : 'pending_signatures',
      ...(contract.manager_signed_at ? { fully_executed_at: now } : {}),
    }).eq('id', contract.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify building manager
    const managerEmail = (building?.profiles as any)?.email;
    if (managerEmail && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const bothSigned = !!contract.manager_signed_at;
        const link = `${process.env.NEXT_PUBLIC_APP_URL || ''}/building/contract`;
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
          to: managerEmail,
          subject: bothSigned
            ? `Your service agreement with ${operator.name} is fully executed`
            : `${operator.name} has signed — your signature is next`,
          html: wrapEmail({
            preheader: bothSigned ? 'Contract fully executed.' : `${operator.name} signed — you're up next.`,
            content: [
              paragraph(
                bothSigned
                  ? `Great news! Both parties have signed the service agreement. The contract is now fully executed and your partnership with ${operator.name} is official.`
                  : `${operator.name} has signed the Lavo service agreement. Your signature is the last step.`
              ),
              button(link, bothSigned ? 'View executed contract →' : 'Review & sign →'),
            ].join(''),
          }),
        });
      } catch {}
    }
  }

  const wasJustExecuted = (isManager && !!contract.operator_signed_at) || (isOperator && !!contract.manager_signed_at);
  return NextResponse.json({ ok: true, executed: wasJustExecuted });
}
