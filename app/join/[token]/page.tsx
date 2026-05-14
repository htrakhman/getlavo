import { supabaseAdmin } from '@/lib/supabase/admin';
import { JoinPlusOne } from './JoinPlusOne';

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

  const [{ count: rc }, { count: wc }] = await Promise.all([
    admin.from('building_requests').select('*', { count: 'exact', head: true }).eq('building_candidate_key', link.building_candidate_key),
    admin.from('building_waitlist').select('*', { count: 'exact', head: true }).eq('building_candidate_key', link.building_candidate_key),
  ]);
  const requestCount = (rc ?? 0) + (wc ?? 0);

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="font-display text-3xl tracking-tight">Bring Lavo to your building</h1>
      <p className="mt-3 text-sm text-ink-300">
        Residents are asking for on-site car washes. Tap plus one to join the list. Current hand raises:{' '}
        <span className="text-gleam font-medium">{requestCount}</span>
      </p>
      <div className="mt-8">
        <JoinPlusOne buildingCandidateKey={link.building_candidate_key} buildingId={link.building_id} />
      </div>
    </main>
  );
}
