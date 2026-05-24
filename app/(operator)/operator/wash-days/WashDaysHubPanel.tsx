'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import {
  WASH_DAYS_HUB_DEFAULTS,
  type WashDaysHubSettings,
  washDaysHubHasContent,
} from '@/lib/operator-wash-days-hub';

type Props = {
  operatorId: string;
  settings: WashDaysHubSettings;
  isEmpty: boolean;
  hasBuildings: boolean;
};

export function WashDaysHubPanel({ operatorId, settings, isEmpty, hasBuildings }: Props) {
  const router = useRouter();
  const resolved = {
    empty_title: settings.empty_title || WASH_DAYS_HUB_DEFAULTS.empty_title,
    empty_message: settings.empty_message ?? '',
    crew_notes: settings.crew_notes ?? '',
  };

  const [editing, setEditing] = useState(false);
  const [emptyTitle, setEmptyTitle] = useState(resolved.empty_title);
  const [emptyMessage, setEmptyMessage] = useState(resolved.empty_message);
  const [crewNotes, setCrewNotes] = useState(resolved.crew_notes);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const showCrewNotes = !isEmpty && resolved.crew_notes.length > 0;
  const showEmptyHub = isEmpty;
  if (!showEmptyHub && !showCrewNotes && !editing && !washDaysHubHasContent(settings)) {
    return (
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={() => setEditing(true)} className="btn-quiet text-xs">
          Customize this page
        </button>
      </div>
    );
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const payload: WashDaysHubSettings = {
      empty_title: emptyTitle.trim() || WASH_DAYS_HUB_DEFAULTS.empty_title,
      empty_message: emptyMessage.trim(),
      crew_notes: crewNotes.trim(),
    };
    const { error } = await supabaseBrowser()
      .from('operators')
      .update({ wash_days_hub: payload })
      .eq('id', operatorId);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditing(false);
    router.refresh();
  }

  function cancel() {
    setEmptyTitle(resolved.empty_title);
    setEmptyMessage(resolved.empty_message);
    setCrewNotes(resolved.crew_notes);
    setEditing(false);
    setErr(null);
  }

  if (editing) {
    return (
      <div className="card p-6 md:p-8">
        <h3 className="font-display text-lg text-ink-100">Customize wash days hub</h3>
        <p className="mt-1 text-xs text-ink-500">
          Set what your crew sees when there are no scheduled wash days, plus optional notes that stay visible when you have upcoming days.
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <label className="label">Empty state headline</label>
            <input
              className="field"
              value={emptyTitle}
              onChange={(e) => setEmptyTitle(e.target.value)}
              placeholder={WASH_DAYS_HUB_DEFAULTS.empty_title}
            />
          </div>
          <div>
            <label className="label">Empty state message</label>
            <textarea
              className="field min-h-[100px]"
              value={emptyMessage}
              onChange={(e) => setEmptyMessage(e.target.value)}
              placeholder={
                hasBuildings
                  ? 'e.g. Propose a wash day for one of your buildings. The property manager confirms before residents are notified.'
                  : 'e.g. Connect with a building partnership first, then propose your first wash day here.'
              }
            />
          </div>
          <div>
            <label className="label">Crew notes (optional)</label>
            <textarea
              className="field min-h-[80px]"
              value={crewNotes}
              onChange={(e) => setCrewNotes(e.target.value)}
              placeholder="Parking access, supply checklist, contact on site…"
            />
            <p className="mt-1 text-xs text-ink-500">Shown above your wash day list when you have scheduled days.</p>
          </div>
        </div>
        {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button type="button" onClick={save} disabled={busy} className="btn-primary text-sm">
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={cancel} className="btn-quiet text-sm">
            Cancel
          </button>
          {saved && <span className="text-xs text-gleam">Saved</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showCrewNotes && (
        <div className="card border-gleam/20 bg-gleam/5 p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-medium uppercase tracking-widest text-gleam">Crew notes</h3>
            <button type="button" onClick={() => setEditing(true)} className="btn-quiet text-xs">
              Edit
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-ink-200">{resolved.crew_notes}</p>
        </div>
      )}

      {showEmptyHub && (
        <div className="card relative p-10 text-center md:p-14">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn-quiet absolute right-4 top-4 text-xs"
          >
            Customize
          </button>
          <p className="font-display text-xl text-ink-100">{resolved.empty_title}</p>
          {resolved.empty_message ? (
            <p className="mx-auto mt-3 max-w-lg whitespace-pre-wrap text-sm text-ink-400">
              {resolved.empty_message}
            </p>
          ) : (
            <p className="mx-auto mt-3 max-w-lg text-sm text-ink-500">
              {hasBuildings
                ? 'Use Propose wash day to schedule service at a partnered building.'
                : 'Partner with a building to start scheduling wash days here.'}
            </p>
          )}
        </div>
      )}

      {!showEmptyHub && !showCrewNotes && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setEditing(true)} className="btn-quiet text-xs">
            Customize this page
          </button>
        </div>
      )}
    </div>
  );
}
