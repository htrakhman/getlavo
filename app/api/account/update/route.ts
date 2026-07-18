import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const Body = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().max(40).nullable().optional(),
  notificationPreferences: z
    .object({
      email_reminder: z.boolean(),
      sms_reminder: z.boolean(),
      email_complete: z.boolean(),
      sms_complete: z.boolean(),
    })
    .optional(),
});

// Server-side save for the resident account page. Browser-side RLS writes were
// silently matching zero rows in production, so profile edits never persisted.
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { fullName, phone, notificationPreferences } = parsed.data;

  const admin = supabaseAdmin();

  const { data: updated, error: updateErr } = await admin
    .from('profiles')
    .update({ full_name: fullName, phone: phone ?? null })
    .eq('id', session.user.id)
    .select('id');
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // The handle_new_user trigger can miss (OAuth timing); create the row rather
  // than silently updating nothing.
  if (!updated?.length) {
    const { error: insertErr } = await admin.from('profiles').insert({
      id: session.user.id,
      role: session.profile.role ?? 'resident',
      full_name: fullName,
      email: session.user.email ?? session.profile.email ?? '',
      phone: phone ?? null,
    });
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  if (notificationPreferences) {
    const { error: prefsErr } = await admin
      .from('residents')
      .update({ notification_preferences: notificationPreferences })
      .eq('profile_id', session.user.id);
    if (prefsErr) return NextResponse.json({ error: prefsErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
