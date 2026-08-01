'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Read-only and inline-editable field boxes for details the resident's account
 * already knows (building, unit, parking spot, access notes). They look like
 * ordinary filled-in form fields so a booking reads as pre-filled rather than
 * as a wall of prose — the difference is that the locked ones belong to the
 * property manager and the editable ones save in place, without sending the
 * resident off to their profile mid-booking.
 */

/** Same visual box as `.field`, without pretending to be an input. */
const BOX =
  'w-full rounded-xl border border-white/10 bg-ink-800/50 px-4 py-3 text-sm text-ink-100 min-h-[46px] flex items-center';

export function ReadonlyField({
  label,
  value,
  hint,
  lockedNote = 'Set by your property manager',
}: {
  label: string;
  value: string | null;
  hint?: string;
  lockedNote?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="label mb-0">{label}</span>
        <span className="text-[10px] uppercase tracking-widest text-ink-500" title={lockedNote}>
          Locked
        </span>
      </div>
      <div className={`mt-1.5 ${BOX} ${value ? '' : 'text-ink-500'}`}>{value || '—'}</div>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function EditableField({
  label,
  field,
  value,
  onChange,
  placeholder,
  multiline,
  hint,
  emptyWarning,
}: {
  label: string;
  /** Column on /api/residents/update this box writes. */
  field: 'spotLabel' | 'vehicleAccessNotes';
  value: string | null;
  onChange: (next: string | null) => void;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
  /** Shown instead of `hint` when the field is empty and the operator needs it. */
  emptyWarning?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  async function save() {
    const next = draft.trim() || null;
    setBusy(true);
    setErr(null);
    // Written through the server route: browser-side RLS writes silently match
    // zero rows here (see /api/residents/update).
    const res = await fetch('/api/residents/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(field === 'vehicleAccessNotes' ? { vehicleAccessMethod: 'front_desk' } : {}),
        [field]: next,
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const j = await res?.json().catch(() => null);
      setErr(typeof j?.error === 'string' ? j.error : 'Could not save — please try again');
      return;
    }
    onChange(next);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Keep the rest of the portal in step with what was just saved.
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="label mb-0">{label}</span>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-gleam hover:underline underline-offset-2"
          >
            {value ? 'Edit' : 'Add'}
          </button>
        ) : (
          <span className="text-[10px] uppercase tracking-widest text-gleam">Editing</span>
        )}
      </div>

      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`mt-1.5 text-left transition hover:border-gleam/40 ${BOX} ${value ? '' : 'text-ink-500'}`}
        >
          {value || placeholder || '—'}
        </button>
      ) : (
        <div className="mt-1.5 space-y-2">
          {multiline ? (
            <textarea
              autoFocus
              className="field min-h-[88px]"
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
            />
          ) : (
            <input
              autoFocus
              className="field"
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); save(); }
                if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
              }}
            />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={busy} className="btn-primary text-xs !px-4 !py-2">
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setDraft(value ?? ''); setEditing(false); setErr(null); }}
              className="btn-quiet text-xs !px-3 !py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
      {!err && saved && <p className="mt-1 text-xs text-gleam">Saved ✓</p>}
      {!err && !saved && !value && emptyWarning && <p className="mt-1 text-xs text-amber-600">{emptyWarning}</p>}
      {!err && !saved && (value || !emptyWarning) && hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
