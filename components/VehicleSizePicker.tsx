'use client';

import { VEHICLE_SIZES, type VehicleSizeId } from '@/lib/vehicle-sizes';
import { VehicleTypeIcon } from './VehicleTypeIcon';

/**
 * The vehicle type question, asked the same way everywhere it's asked —
 * onboarding, the vehicle editor, and the booking form when an older vehicle
 * has never been asked.
 *
 * It's a picture question, not a text one: "SUV / Small SUV" means different
 * things to different people, and a resident who mis-answers gets quoted the
 * wrong price on every future wash. The silhouettes are the same ones the
 * operator sees when setting their tier prices, so both sides of the
 * transaction are looking at the same three cars.
 */
export function VehicleSizePicker({
  value,
  onChange,
  disabled,
  label = 'Vehicle type',
  hint = 'Operators price by vehicle size — this sets your rate.',
}: {
  value: VehicleSizeId | null;
  onChange: (next: VehicleSizeId) => void;
  disabled?: boolean;
  label?: string | null;
  hint?: string | null;
}) {
  return (
    <div>
      {label && (
        <label className="label">
          {label} <span className="text-gleam">*</span>
        </label>
      )}
      <div className="mt-1 grid grid-cols-3 gap-2">
        {VEHICLE_SIZES.map((s) => {
          const selected = value === s.id;
          return (
            <button
              type="button"
              key={s.id}
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(s.id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition disabled:opacity-50 ${
                selected ? 'border-gleam/60 bg-gleam/5 text-gleam' : 'border-white/10 text-ink-300 hover:border-white/20'
              }`}
            >
              <VehicleTypeIcon type={s.id} className="h-6 w-14 shrink-0" />
              <span className="text-[11px] leading-tight">{s.label}</span>
            </button>
          );
        })}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
