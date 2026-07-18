import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendAdminNotification } from '@/lib/email/resend';

// Called by the operator onboarding wizard after the profile is created.
// The wizard writes straight to the database from the browser, so this is
// the only server hop where an admin notification can be sent.
export async function POST() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: op } = await supabaseAdmin()
    .from('operators')
    .select('id, name, slug, description, service_radius_miles, base_price_cents, created_at')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (!op) return NextResponse.json({ error: 'operator not found' }, { status: 404 });

  await sendAdminNotification({
    subject: `New operator signup: ${op.name}`,
    lines: [
      `${session.profile.full_name} (${session.profile.email}) completed operator onboarding.`,
      `Business: ${op.name}`,
      op.description ? `Description: ${op.description}` : '',
      `Service radius: ${op.service_radius_miles ?? '—'} miles`,
      `Base price: $${((op.base_price_cents ?? 0) / 100).toFixed(2)}`,
      `Operator ID: ${op.id}`,
    ].filter(Boolean),
    replyTo: session.profile.email || undefined,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
