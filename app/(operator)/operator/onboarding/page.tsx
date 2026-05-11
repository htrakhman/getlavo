import { supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OnboardingForm } from './OnboardingForm';

export default async function OperatorOnboardingPage() {
  const sb = supabaseServer();
  const { data: op } = await sb.from('operators').select('id').limit(1).maybeSingle();
  if (op) redirect('/operator');
  return <OnboardingForm />;
}
