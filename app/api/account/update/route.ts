import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';
import { MAX_NOTIFICATION_EMAILS, isValidEmail, normalizeNotificationEmails } from '@/lib/notification-emails';

const Body = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().max(40).nullable().optional(),
  notificationEmails: z.array(z.string().max(254)).max(MAX_NOTIFICATION_EMAILS).optional(),
  // SMS has no configured sender, so the account page no longer offers those
  // toggles; the stored sms_* flags are left untouched rather than reset.
  notificationPreferences: z
    .object({
      email_reminder: z.boolean(),
      email_complete: z.boolean(),
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
  const { fullName, phone, notificationEmails, notificationPreferences } = parsed.data;

  const primaryEmail = session.user.email ?? session.profile.email ?? '';

  // Reject bad addresses instead of dropping them: a silently discarded entry
  // reads as "saved" and the extra recipient never hears about a wash.
  const entered = (notificationEmails ?? []).map((e) => e.trim()).filter(Boolean);
  const invalid = entered.find((e) => !isValidEmail(e));
  if (invalid) {
    return NextResponse.json({ error: `"${invalid}" is not a valid email address` }, { status: 400 });
  }
  const extraEmails = normalizeNotificationEmails(entered, primaryEmail);

  const admin = supabaseAdmin();

  const { data: updated, error: updateErr } = await admin
    .from('profiles')
    .update({
      full_name: fullName,
      phone: phone ?? null,
      ...(notificationEmails ? { notification_emails: extraEmails } : {}),
    })
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
      email: primaryEmail,
      phone: phone ?? null,
      notification_emails: extraEmails,
    });
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  if (notificationPreferences) {
    // Merge: the column holds keys the form no longer renders, and a whole-object
    // write would silently drop them.
    const { data: resident } = await admin
      .from('residents')
      .select('notification_preferences')
      .eq('profile_id', session.user.id)
      .maybeSingle();
    const merged = { ...(resident?.notification_preferences ?? {}), ...notificationPreferences };

    const { error: prefsErr } = await admin
      .from('residents')
      .update({ notification_preferences: merged })
      .eq('profile_id', session.user.id);
    if (prefsErr) return NextResponse.json({ error: prefsErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
