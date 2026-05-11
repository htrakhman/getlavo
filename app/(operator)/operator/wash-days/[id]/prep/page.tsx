import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import { dateShort } from '@/lib/format';
import Link from 'next/link';
import { PrintButton } from './PrintButton';
import { RescheduleButton } from './RescheduleButton';

export default async function PrepPage({ params }: { params: { id: string } }) {
  const sb = supabaseServer();

  const { data: wd } = await sb
    .from('wash_days')
    .select('id, scheduled_for, building:buildings(name, address_line1, garage_levels_json)')
    .eq('id', params.id)
    .maybeSingle();
  if (!wd) return <div className="p-6">Not found.</div>;

  const { data: washes } = await sb
    .from('washes')
    .select(`
      id, spot_label, status,
      vehicle:vehicles(license_plate, make, model, color, year),
      resident:residents(unit_number, floor_number, package:service_packages(name), profile:profiles(full_name))
    `)
    .eq('wash_day_id', wd.id);

  const { data: skips } = await sb.from('wash_skips').select('resident_id').eq('wash_day_id', wd.id);
  const skippedIds = new Set((skips ?? []).map((s) => s.resident_id));

  const grouped: Record<string, any[]> = {};
  for (const w of washes ?? []) {
    const floor = (w.resident as any)?.floor_number != null
      ? `Floor ${(w.resident as any).floor_number}`
      : (w.spot_label?.split('-')[0] ?? 'General');
    (grouped[floor] ||= []).push(w);
  }
  const floors = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));

  const total = washes?.length ?? 0;
  const skipped = (washes ?? []).filter((w: any) => skippedIds.has((w.resident as any)?.id)).length;
  const expected = total - skipped;
  const building = wd.building as any;

  return (
    <>
      <PageHeader
        eyebrow={`Prep · ${dateShort(wd.scheduled_for)}`}
        title={building?.name ?? 'Wash day'}
        action={<Link href={`/operator/wash-days/${wd.id}`} className="btn-primary">Open crew tool →</Link>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
        <div className="stat">
          <div className="text-xs uppercase tracking-widest text-ink-300">Vehicles expected</div>
          <div className="mt-2 font-display text-4xl">{expected}</div>
        </div>
        <div className="stat">
          <div className="text-xs uppercase tracking-widest text-ink-300">Skipped</div>
          <div className="mt-2 font-display text-4xl">{skipped}</div>
        </div>
        <div className="stat">
          <div className="text-xs uppercase tracking-widest text-ink-300">Floors</div>
          <div className="mt-2 font-display text-4xl">{floors.length}</div>
        </div>
      </div>

      {building?.address_line1 && (
        <div className="card p-5 mb-6">
          <div className="text-xs uppercase tracking-widest text-ink-400">Address</div>
          <div className="mt-1 text-lg">{building.address_line1}</div>
          {building.garage_levels_json?.length > 0 && (
            <div className="mt-3">
              <div className="text-xs uppercase tracking-widest text-ink-400">Garage</div>
              <ul className="mt-2 text-sm">
                {building.garage_levels_json.map((f: any, i: number) => (
                  <li key={i} className="text-ink-300">
                    {f.label} · {f.spotCount} spots {f.notes ? `· ${f.notes}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {floors.map(([label, items]) => (
          <div key={label}>
            <h2 className="mb-2 text-xs uppercase tracking-widest text-gleam">
              {label} · {items.filter((w: any) => !skippedIds.has((w.resident as any)?.id)).length} vehicle{items.length !== 1 ? 's' : ''}
            </h2>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-widest text-ink-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Spot</th>
                    <th className="px-4 py-2 text-left">Resident</th>
                    <th className="px-4 py-2 text-left">Vehicle</th>
                    <th className="px-4 py-2 text-left">Plate</th>
                    <th className="px-4 py-2 text-left">Package</th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .sort((a: any, b: any) => (a.spot_label ?? '').localeCompare(b.spot_label ?? ''))
                    .map((w: any) => {
                      const skip = skippedIds.has(w.resident?.id);
                      return (
                        <tr key={w.id} className={`border-t border-white/5 ${skip ? 'text-ink-500 line-through' : ''}`}>
                          <td className="px-4 py-2 font-mono text-xs">{w.spot_label ?? '—'}</td>
                          <td className="px-4 py-2">{w.resident?.profile?.full_name ?? '—'} <span className="text-xs text-ink-500">· Unit {w.resident?.unit_number}</span></td>
                          <td className="px-4 py-2">{w.vehicle?.year} {w.vehicle?.make} {w.vehicle?.model} <span className="text-xs text-ink-500">· {w.vehicle?.color}</span></td>
                          <td className="px-4 py-2 font-mono text-xs">{w.vehicle?.license_plate}</td>
                          <td className="px-4 py-2 text-xs">{w.resident?.package?.name ?? '—'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-3 print:hidden">
        <PrintButton />
        <RescheduleButton washDayId={wd.id} currentDate={wd.scheduled_for} />
      </div>
    </>
  );
}
