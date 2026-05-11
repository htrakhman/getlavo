import { getSessionUser } from '@/lib/supabase/server';
import { getCurrentBuildingForSession } from '@/lib/building';
import { redirect } from 'next/navigation';
import OnboardingForm from './OnboardingForm';

export default async function BuildingOnboardingPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const { current } = await getCurrentBuildingForSession(session.user.id);
  if (current) redirect('/building');

  return <OnboardingForm />;
}
