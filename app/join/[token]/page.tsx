import { supabaseAdmin } from '@/lib/supabase/admin';
import { BuildingRequestForm } from '@/components/BuildingRequestForm';

export default async function JoinLandingPage({ params }: { params: { token: string } }) {
  const admin = supabaseAdmin();
  const { data: link } = await admin
    .from('building_share_links')
    .select('id, token, building_candidate_key, building_id, click_count')
    .eq('token', params.token)
    .maybeSingle();

  if (!link) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-2xl">Link not found</h1>
        <p className="mt-2 text-sm text-ink-400">Ask your neighbor for a fresh Lavo invite link.</p>
      </main>
    );
  }

  await admin
    .from('building_share_links')
    .update({ click_count: (link.click_count ?? 0) + 1 })
    .eq('id', link.id);

  const [{ count: rc }, { count: wc }, { data: sampleRequest }] = await Promise.all([
    admin.from('building_requests').select('*', { count: 'exact', head: true }).eq('building_candidate_key', link.building_candidate_key),
    admin.from('building_waitlist').select('*', { count: 'exact', head: true }).eq('building_candidate_key', link.building_candidate_key),
    admin
      .from('building_requests')
      .select('building_display_name, formatted_address')
      .eq('building_candidate_key', link.building_candidate_key)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const requestCount = (rc ?? 0) + (wc ?? 0);

  const defaultBuildingLabel =
    sampleRequest?.building_display_name?.trim() ||
    sampleRequest?.formatted_address?.trim() ||
    'your building';
  const hideBuildingField = !!(sampleRequest?.building_display_name || sampleRequest?.formatted_address);

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="font-display text-3xl tracking-tight">Request Lavo at your building</h1>
      <p className="mt-3 text-sm text-ink-300">
        A neighbor asked us to bring Lavo here. Add your info to join the request.
        {requestCount > 0 && (
          <>
            {' '}
            <span className="text-gleam font-medium">
              {requestCount} {requestCount === 1 ? 'resident has' : 'residents have'} already requested it.
            </span>
          </>
        )}
      </p>
      <div className="mt-8 card p-6">
        <BuildingRequestForm
          buildingCandidateKey={link.building_candidate_key}
          buildingId={link.building_id}
          defaultBuildingLabel={defaultBuildingLabel}
          hideBuildingField={hideBuildingField}
          mode="neighbor"
          channel="neighbor_share"
          source="referral"
        />
      </div>
    </main>
  );
}
