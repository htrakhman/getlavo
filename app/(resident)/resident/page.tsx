import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export default async function ResidentRoot() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  // Use admin client — supabaseServer() can silently return null when auth.uid() is not
  // propagated in the PostgREST context (cold-start / JWT timing). Already scoped to the
  // authenticated user via the explicit profile_id filter.
  const { data: resident } = await supabaseAdmin().from('residents').select('id').eq('profile_id', session.user.id).maybeSingle();
  if (!resident) redirect('/resident/onboarding');
  redirect('/resident/washes');
}
