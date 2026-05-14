'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

export type PlacePick = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
};

export function PlacesAutocomplete({
  onPick,
  onPickPlaceId,
  disabled,
  placeholder = 'Start typing your building address',
}: {
  onPick?: (pick: PlacePick) => void;
  /** @deprecated prefer onPick which carries the full prediction */
  onPickPlaceId?: (placeId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const [q, setQ] = useState('');
  const [preds, setPreds] = useState<PlacePick[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const sessionToken = useMemo(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`), []);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    async (input: string) => {
      if (input.length < 3) {
        setPreds([]);
        return;
      }
      setBusy(true);
      try {
        const res = await fetch('/api/places/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, sessionToken }),
        });
        const data = await res.json();
        setPreds(Array.isArray(data.predictions) ? data.predictions : []);
      } catch {
        setPreds([]);
      } finally {
        setBusy(false);
      }
    },
    [sessionToken],
  );

  useEffect(() => {
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => run(q), 220);
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, [q, run]);

  return (
    <div className="relative w-full text-left">
      <label htmlFor={id} className="sr-only">
        Search your building address
      </label>
      <input
        id={id}
        type="text"
        autoComplete="street-address"
        disabled={disabled}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-base text-ink-100 outline-none ring-gleam/40 focus:ring-2 placeholder:text-ink-500"
      />
      {busy && <div className="absolute right-3 top-3.5 text-xs text-ink-500">Searching…</div>}
      {open && preds.length > 0 && (
        <ul className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-white/20 bg-ink-800 py-1 shadow-2xl">
          {preds.map((p, i) => (
            <li key={p.placeId || `${p.mainText}-${i}`}>
              <button
                type="button"
                className="w-full px-4 py-3 text-left text-sm hover:bg-white/10"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQ(`${p.mainText} ${p.secondaryText}`.trim());
                  setOpen(false);
                  onPick?.(p);
                  if (p.placeId) onPickPlaceId?.(p.placeId);
                }}
              >
                <div className="font-medium text-white">{p.mainText}</div>
                <div className="text-xs text-ink-300">{p.secondaryText}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
