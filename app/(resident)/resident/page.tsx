import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function ResidentRoot() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const { data: resident } = await supabaseAdmin().from('residents').select('id').eq('profile_id', session.user.id).maybeSingle();
  if (!resident) redirect('/resident/onboarding');
  redirect('/resident/washes');
}
