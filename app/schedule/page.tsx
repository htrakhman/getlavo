import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Scheduling resolver for the building QR funnel (`/schedule?b={slug}`).
 * Routes a signed-in resident to the booking page for their building's
 * assigned operator; anyone not ready yet is sent to the step that gets
 * them there (login → onboarding → confirm-switch).
 */
export default async function SchedulePage({ searchParams }: { searchParams: { b?: string } }) {
  const slug = (searchParams.b ?? '').trim();
  if (!slug) redirect('/resident/book');

  const self = `/schedule?b=${encodeURIComponent(slug)}`;
  const session = await getSessionUser();
  if (!session) redirect(`/login?b=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(self)}`);

  const admin = supabaseAdmin();
  const { data: building } = await admin
    .from('buildings')
    .select('id')
    .eq('slug', slug)
    .in('status', ['prospect', 'pilot', 'active'])
    .maybeSingle();
  if (!building) redirect('/resident/book');

  const { data: resident } = await admin
    .from('residents')
    .select('id, building_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();

  if (!resident) {
    redirect(`/resident/onboarding?b=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(self)}`);
  }
  if (resident.building_id !== building.id) {
    // /b/[slug] renders the confirm-switch prompt for this case.
    redirect(`/b/${encodeURIComponent(slug)}`);
  }

  const { data: partnership } = await admin
    .from('partnerships')
    .select('id, operator:operators(id, status, stripe_onboarding_complete)')
    .eq('building_id', building.id)
    .eq('status', 'active')
    .maybeSingle();

  const operator = (partnership?.operator as any) ?? null;
  if (operator && operator.status === 'approved' && operator.stripe_onboarding_complete) {
    redirect(`/resident/book/${operator.id}?partnershipId=${partnership!.id}`);
  }

  // No bookable assigned operator yet — the general booking page handles that.
  redirect('/resident/book');
}
