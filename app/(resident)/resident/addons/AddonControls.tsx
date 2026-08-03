'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { parseSizePrices, priceForVehicle, type VehicleSizeId } from '@/lib/vehicle-sizes';
import { SizePriceList } from '@/components/SizePriceList';

export function AddonRow({ residentId, addon, operatorName, alreadyRecurring, vehicleSize }: { residentId: string; addon: any; operatorName: string; alreadyRecurring: boolean; vehicleSize: VehicleSizeId | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function addRecurring() {
    setBusy(true);
    const sb = supabaseBrowser();
    await sb.from('resident_addons').insert({
      resident_id: residentId,
      operator_addon_id: addon.id,
      active: true,
    });
    setBusy(false);
    router.refresh();
  }

  const tiers = parseSizePrices(addon.size_prices);

  return (
    <div className="card p-6">
      <div className="font-display text-2xl">{addon.label}</div>
      <div className="mt-1 text-sm text-ink-400">{operatorName}</div>
      <div className="mt-4 font-display text-2xl text-gleam">
        {/* The resident's own rate once their vehicle type is on file — this is
            what a wash with this add-on actually bills. */}
        {tiers.length > 0 && !vehicleSize && <span className="text-base text-ink-400">from </span>}
        ${(priceForVehicle(addon, vehicleSize) / 100).toFixed(2)}
      </div>
      <SizePriceList
        raw={addon.size_prices}
        flatCents={addon.price_cents}
        decimals={2}
        className="mt-3 text-xs text-ink-400"
      />
      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={addRecurring}
          disabled={busy || alreadyRecurring}
          className="btn-primary text-sm"
        >
          {alreadyRecurring ? 'On every wash ✓' : 'Add to every wash'}
        </button>
        <a href={`/api/addons/checkout?addon=${addon.id}`} className="btn-quiet text-sm text-center">
          Add to next wash only
        </a>
      </div>
    </div>
  );
}

export function RecurringAddons({ items, vehicleSize }: { items: any[]; vehicleSize: VehicleSizeId | null }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string) {
    setBusyId(id);
    const sb = supabaseBrowser();
    await sb.from('resident_addons').update({ active: false }).eq('id', id);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {items.map((row) => (
        <div key={row.id} className="card flex items-center justify-between p-4">
          <div>
            <div className="font-medium">{row.operator_addon?.label}</div>
            <div className="text-xs text-ink-400">
              {parseSizePrices(row.operator_addon?.size_prices).length > 0 && !vehicleSize ? 'from ' : ''}
              ${(priceForVehicle(row.operator_addon ?? {}, vehicleSize) / 100).toFixed(2)} per wash
            </div>
          </div>
          <button onClick={() => remove(row.id)} disabled={busyId === row.id} className="text-xs text-ink-400 hover:text-red-400">
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
