'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const [mounted, setMounted] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; top: number; width: number } | null>(null);
  const sessionToken = useMemo(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`), []);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setMounted(true), []);

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

  // The dropdown is rendered in a portal on <body> so it escapes any ancestor
  // stacking context (e.g. cards with backdrop-blur) or overflow clipping that
  // would otherwise hide it behind later page sections. Keep it aligned to the
  // input as the page scrolls or resizes while it is open.
  const syncAnchor = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ left: r.left, top: r.bottom, width: r.width });
  }, []);

  const dropdownOpen = open && preds.length > 0;

  useEffect(() => {
    if (!dropdownOpen) return;
    syncAnchor();
    window.addEventListener('scroll', syncAnchor, true);
    window.addEventListener('resize', syncAnchor);
    return () => {
      window.removeEventListener('scroll', syncAnchor, true);
      window.removeEventListener('resize', syncAnchor);
    };
  }, [dropdownOpen, preds.length, syncAnchor]);

  function pick(p: PlacePick) {
    setQ(`${p.mainText} ${p.secondaryText}`.trim());
    setOpen(false);
    onPick?.(p);
    if (p.placeId) onPickPlaceId?.(p.placeId);
  }

  return (
    <div className="relative w-full text-left">
      <label htmlFor={id} className="sr-only">
        Search your building address
      </label>
      <input
        id={id}
        ref={inputRef}
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
      {mounted && dropdownOpen && anchor &&
        createPortal(
          <ul
            style={{
              position: 'fixed',
              left: anchor.left,
              top: anchor.top + 8,
              width: anchor.width,
              zIndex: 9999,
            }}
            className="max-h-64 overflow-auto rounded-xl border border-white/20 bg-ink-800 py-1 shadow-2xl"
          >
            {preds.map((p, i) => (
              <li key={p.placeId || `${p.mainText}-${i}`}>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left text-sm hover:bg-white/10"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(p)}
                >
                  <div className="font-medium text-white">{p.mainText}</div>
                  <div className="text-xs text-ink-300">{p.secondaryText}</div>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
