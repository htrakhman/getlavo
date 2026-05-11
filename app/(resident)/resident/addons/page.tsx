import { PageHeader } from '@/components/PortalShell';
import { supabaseServer, getSessionUser } from '@/lib/supabase/server';
import { money } from '@/lib/format';
import { redirect } from 'next/navigation';
import { AddonRow, RecurringAddons } from './AddonControls';

export default async function AddonsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();

  const { data: r } = await sb
    .from('residents')
    .select('id, building_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!r) redirect('/resident/onboarding');

  const { data: partnership } = await sb
    .from('partnerships')
    .select('operator:operators(id, name, operator_addons(*))')
    .eq('building_id', r.building_id)
    .in('status', ['active', 'pilot'])
    .maybeSingle();

  const operator = (partnership?.operator as any) ?? null;
  const addons: any[] = (operator?.operator_addons ?? []).filter((a: any) => a.active);

  const { data: recurring } = await sb
    .from('resident_addons')
    .select('id, operator_addon:operator_addons(id, label, price_cents)')
    .eq('resident_id', r.id)
    .eq('active', true);

  return (
    <>
      <PageHeader eyebrow="Upgrades" title="Add-ons" />

      {recurring && recurring.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-ink-400 mb-3">On every wash</h2>
          <RecurringAddons items={recurring} />
        </div>
      )}

      {!operator || addons.length === 0 ? (
        <div className="card p-10 text-center text-ink-400">
          Add-ons will appear here once your building's car wash crew is confirmed.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {addons.map((a) => (
            <AddonRow
              key={a.id}
              residentId={r.id}
              addon={a}
              operatorName={operator.name}
              alreadyRecurring={!!recurring?.find((x: any) => (x.operator_addon as any)?.id === a.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
