import { getSessionUser } from '@/lib/supabase/server';
import { getCurrentBuildingForSession } from '@/lib/building';
import { redirect } from 'next/navigation';
import OnboardingForm from './OnboardingForm';

export default async function BuildingOnboardingPage({ searchParams }: { searchParams: { add?: string } }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const { current } = await getCurrentBuildingForSession(session.user.id);
  if (current && searchParams.add !== '1') redirect('/building');

  return <OnboardingForm />;
}
