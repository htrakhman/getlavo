import { PageHeader } from '@/components/PortalShell';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { AccountForm } from './AccountForm';

export default async function AccountPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  // Admin client (auth already checked above): RLS-scoped reads of these rows
  // fail in production, which rendered stale metadata instead of saved edits.
  const admin = supabaseAdmin();

  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('id', session.user.id)
    .maybeSingle();

  const { data: resident } = await admin
    .from('residents')
    .select('id, notification_preferences')
    .eq('profile_id', session.user.id)
    .maybeSingle();

  return (
    <>
      <PageHeader eyebrow="Account" title="Profile & notifications" />
      <AccountForm
        profile={profile}
        residentId={resident?.id ?? null}
        prefs={resident?.notification_preferences ?? {
          email_reminder: true, sms_reminder: true,
          email_complete: true, sms_complete: true,
        }}
      />
    </>
  );
}
