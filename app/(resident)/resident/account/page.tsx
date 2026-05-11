import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AccountForm } from './AccountForm';

export default async function AccountPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();

  const { data: profile } = await sb
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('id', session.user.id)
    .maybeSingle();

  const { data: resident } = await sb
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
