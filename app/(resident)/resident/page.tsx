import { redirect } from 'next/navigation';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';

export default async function ResidentRoot() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();
  const { data: resident } = await sb.from('residents').select('id').eq('profile_id', session.user.id).maybeSingle();
  if (!resident) redirect('/resident/onboarding');
  redirect('/resident/washes');
}
