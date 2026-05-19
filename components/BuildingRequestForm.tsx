'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { captureEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

export type BuildingRequestFormProps = {
  buildingCandidateKey: string;
  placeId?: string | null;
  formattedAddress?: string | null;
  defaultBuildingLabel: string;
  buildingId?: string | null;
  /** Registered building slug — shows secondary signup link when set. */
  registeredBuildingSlug?: string | null;
  mode?: 'default' | 'neighbor';
  channel?: 'building_request' | 'neighbor_share';
  source?: string;
  /** Neighbor mode: hide building field when label is known from server. */
  hideBuildingField?: boolean;
};

export function BuildingRequestForm({
  buildingCandidateKey,
  placeId,
  formattedAddress,
  defaultBuildingLabel,
  buildingId,
  registeredBuildingSlug,
  mode = 'default',
  channel = 'building_request',
  source = 'organic',
  hideBuildingField = false,
}: BuildingRequestFormProps) {
  const [residentEmail, setResidentEmail] = useState('');
  const [buildingLabel, setBuildingLabel] = useState(defaultBuildingLabel);
  const [residentFirstName, setResidentFirstName] = useState('');
  const [mgmtEmail, setMgmtEmail] = useState('');
  const [mgmtContactName, setMgmtContactName] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [confirmBuildingLabel, setConfirmBuildingLabel] = useState('');
  const [confirmMgmtEmail, setConfirmMgmtEmail] = useState<string | null>(null);

  useEffect(() => {
    setBuildingLabel(defaultBuildingLabel);
  }, [defaultBuildingLabel]);

  useEffect(() => {
    if (mode === 'default') {
      captureEvent(ANALYTICS_EVENTS.building_not_live_viewed, {
        candidateKey: buildingCandidateKey,
        hasBuilding: !!buildingId,
      });
    }
  }, [mode, buildingCandidateKey, buildingId]);

  async function submit() {
    setErr(null);
    if (!residentEmail.trim().includes('@')) {
      setErr('Please enter a valid email.');
      return;
    }
    if (!hideBuildingField && !buildingLabel.trim()) {
      setErr('Please enter your building name or address.');
      return;
    }

    setBusy(true);
    const mgmt = mgmtEmail.trim();
    try {
      const res = await fetch('/api/building-funnel/submit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingCandidateKey,
          buildingId,
          placeId,
          formattedAddress,
          residentEmail: residentEmail.trim(),
          buildingLabel: (hideBuildingField ? defaultBuildingLabel : buildingLabel).trim(),
          residentFirstName: residentFirstName.trim() || undefined,
          mgmtEmail: mgmt.includes('@') ? mgmt : undefined,
          mgmtContactName: mgmtContactName.trim() || undefined,
          notes: notes.trim() || undefined,
          channel,
          source,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === 'string' ? data.error : 'Could not submit. Try again.');
        return;
      }

      setShareUrl(data.shareUrl ?? null);
      setConfirmBuildingLabel((data.buildingLabel as string) || buildingLabel.trim() || 'your building');
      setConfirmMgmtEmail(mgmt.includes('@') ? mgmt : null);
      setSubmitted(true);

      captureEvent(ANALYTICS_EVENTS.building_request_submitted, {
        candidateKey: buildingCandidateKey,
        mode,
        hasMgmtEmail: mgmt.includes('@'),
      });
      if (mgmt.includes('@')) {
        captureEvent(ANALYTICS_EVENTS.building_contact_email_added, { candidateKey: buildingCandidateKey });
      }
      if (data.events?.internalEmailSent) {
        captureEvent(ANALYTICS_EVENTS.internal_request_email_sent, { candidateKey: buildingCandidateKey });
      }
      if (data.events?.buildingContactEmailSent) {
        captureEvent(ANALYTICS_EVENTS.building_contact_email_sent, { candidateKey: buildingCandidateKey });
      }
    } catch {
      setErr('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function copyShareLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    captureEvent(ANALYTICS_EVENTS.building_share_link_copied, { candidateKey: buildingCandidateKey });
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-display text-2xl">You&apos;re on the list.</h3>
          {confirmMgmtEmail ? (
            <p className="mt-3 text-sm text-ink-300 leading-relaxed">
              Thanks. We sent a quick note to {confirmMgmtEmail} letting them know a resident requested Lavo at{' '}
              {confirmBuildingLabel}. We&apos;ll also follow up from our side.
            </p>
          ) : (
            <p className="mt-3 text-sm text-ink-300 leading-relaxed">
              Thanks. We&apos;ll track demand for {confirmBuildingLabel} and try to reach the property team. If Lavo
              launches there, we&apos;ll email you first.
            </p>
          )}
        </div>

        {shareUrl && (
          <div className="border-t border-white/10 pt-5 space-y-3">
            <p className="text-sm text-ink-300">Want to help bring Lavo here faster?</p>
            <p className="text-sm text-ink-400">Share this link with neighbors so they can request it too:</p>
            <p className="break-all rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-mono text-gleam">
              {shareUrl}
            </p>
            <ShareActions url={shareUrl} onCopy={copyShareLink} />
          </div>
        )}

        {registeredBuildingSlug && (
          <Link
            href={`/signup?role=resident&building=${encodeURIComponent(registeredBuildingSlug)}&promo=FIRSTWASH`}
            className="btn-quiet block w-full py-3 text-center text-sm"
          >
            Sign up as a resident
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {mode === 'default' && (
        <div>
          <h3 className="font-display text-2xl">Request Lavo at your building</h3>
          <p className="mt-2 text-sm text-ink-300">
            Your building is not live yet. Add your info and we&apos;ll try to bring Lavo to your garage or parking lot.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <Field label="Your email" required>
          <input
            className="field w-full"
            type="email"
            autoComplete="email"
            value={residentEmail}
            onChange={(e) => setResidentEmail(e.target.value)}
            required
          />
        </Field>

        {!hideBuildingField && (
          <Field label="Building name or address" required>
            <input
              className="field w-full"
              value={buildingLabel}
              onChange={(e) => setBuildingLabel(e.target.value)}
              required
            />
          </Field>
        )}

        <Field label="Your first name, optional">
          <input
            className="field w-full"
            value={residentFirstName}
            onChange={(e) => setResidentFirstName(e.target.value)}
          />
        </Field>

        <Field
          label="Building contact email, optional"
          helper="Leasing office, concierge, property manager, or community manager email. Optional, but it helps us move faster."
        >
          <input
            className="field w-full"
            type="email"
            value={mgmtEmail}
            onChange={(e) => setMgmtEmail(e.target.value)}
          />
        </Field>

        <Field label="Building contact name, optional">
          <input
            className="field w-full"
            value={mgmtContactName}
            onChange={(e) => setMgmtContactName(e.target.value)}
          />
        </Field>

        <Field label="Anything we should know, optional">
          <textarea
            className="field w-full min-h-[88px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </Field>
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <button
        type="button"
        className="btn-primary w-full py-3 text-sm"
        disabled={busy}
        onClick={() => submit()}
      >
        {busy ? 'Submitting…' : 'Request Lavo'}
      </button>

      {registeredBuildingSlug && (
        <Link
          href={`/signup?role=resident&building=${encodeURIComponent(registeredBuildingSlug)}&promo=FIRSTWASH`}
          className="btn-quiet block w-full py-3 text-center text-sm"
        >
          Sign up as a resident
        </Link>
      )}
    </div>
  );
}

function Field({
  label,
  helper,
  required,
  children,
}: {
  label: string;
  helper?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-ink-200">
        {label}
        {required ? <span className="text-ink-500"> *</span> : null}
      </span>
      {children}
      {helper && <span className="block text-xs text-ink-500 leading-relaxed">{helper}</span>}
    </label>
  );
}

function ShareActions({ url, onCopy }: { url: string; onCopy: () => void }) {
  const text = encodeURIComponent(`Request Lavo at our building: ${url}`);
  return (
    <div className="flex flex-wrap gap-2">
      <a className="btn-quiet px-3 py-2 text-xs" href={`sms:&body=${text}`}>
        SMS
      </a>
      <a className="btn-quiet px-3 py-2 text-xs" href={`https://wa.me/?text=${text}`} target="_blank" rel="noreferrer">
        WhatsApp
      </a>
      <button type="button" className="btn-quiet px-3 py-2 text-xs" onClick={onCopy}>
        Copy link
      </button>
    </div>
  );
}
