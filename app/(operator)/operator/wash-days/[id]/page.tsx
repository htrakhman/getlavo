import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { CrewTool } from './CrewTool';
import { redirect } from 'next/navigation';

export default async function WashDayPage({ params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();
  const { data: op } = await sb.from('operators').select('id').eq('owner_id', session.user.id).maybeSingle();
  if (!op) redirect('/operator/onboarding');

  const { data: wd } = await sb
    .from('wash_days')
    .select('*, building:buildings(name, garage_levels_json)')
    .eq('id', params.id)
    .eq('operator_id', op.id)
    .maybeSingle();
  if (!wd) return <div className="p-6">Not found.</div>;

  const { data: washes } = await sb
    .from('washes')
    .select(`
      *,
      vehicle:vehicles(license_plate, make, model, color, year),
      resident:residents(id, unit_number, spot_label, floor_number, package:service_packages(name), profile:profiles(full_name)),
      addon_orders(operator_addon:operator_addons(label))
    `)
    .eq('wash_day_id', wd.id);

  const grouped: Record<string, any[]> = {};
  for (const w of washes ?? []) {
    const floor = w.resident?.floor_number != null
      ? `Floor ${w.resident.floor_number}`
      : (w.spot_label?.split('-')[0] ?? 'General');
    (grouped[floor] ||= []).push(w);
  }
  const floors = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));

  const { data: skips } = await sb.from('wash_skips').select('resident_id').eq('wash_day_id', wd.id);
  const skippedIds = new Set((skips ?? []).map((s) => s.resident_id));

  const active = floors.map(([label, items]) => [label, items.filter((w: any) => !skippedIds.has(w.resident?.id))] as [string, any[]]);
  const skipped = (washes ?? []).filter((w: any) => skippedIds.has(w.resident?.id));

  return (
    <CrewTool
      washDayId={wd.id}
      buildingName={(wd.building as any)?.name ?? 'Building'}
      scheduledFor={wd.scheduled_for}
      startedAt={wd.started_at}
      completedAt={wd.completed_at}
      floors={active}
      skipped={skipped}
    />
  );
}
