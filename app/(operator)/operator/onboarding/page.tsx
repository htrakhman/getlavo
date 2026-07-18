import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OnboardingForm } from './OnboardingForm';

export default async function OperatorOnboardingPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();
  // Must be scoped to the signed-in owner: operators_public_read exposes other
  // approved operators, and an unfiltered probe redirect-loops new signups
  // between /operator and /operator/onboarding.
  const { data: op } = await sb
    .from('operators')
    .select('id')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (op) redirect('/operator');
  return <OnboardingForm />;
}
