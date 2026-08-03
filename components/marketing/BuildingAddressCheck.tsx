'use client';

import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PlacesAutocomplete, type PlacePick } from '@/components/PlacesAutocomplete';
import { isValidEmail } from '@/lib/notification-emails';

type CheckResult =
  | { status: 'served'; building: { slug: string; name: string }; redirectUrl: string }
  | { status: 'not_served'; building: { name: string } | null }
  | { status: 'waitlisted'; building: { name: string } | null; normalizedAddress: string | null };

type Stage = 'address' | 'checking' | 'served' | 'need-email' | 'saving' | 'waitlisted' | 'error';

/**
 * Address-check widget: "is my building on Lavo?"
 *
 * Meant to be embedded on landing pages (city pages, `/for-properties`,
 * resource guides) — narrower than `CheckBuildingFlow`, which drives the full
 * app funnel with pricing cards and partnership panels. This one does exactly
 * the four steps the address check needs: enter an address, resolve it against
 * served buildings, hand a served resident to signup, or capture an unserved
 * one to the waitlist.
 *
 * "Served" is decided server-side in /api/building-address-check using the
 * same building-resolution logic as the main funnel — this widget does not
 * duplicate that judgment client-side.
 */
export function BuildingAddressCheck({
  className = '',
  title = 'See if Lavo is at your building',
}: {
  className?: string;
  title?: string;
}) {
  const pathname = usePathname();
  const sessionToken = useMemo(
    () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`),
    [],
  );

  const [stage, setStage] = useState<Stage>('address');
  const [pick, setPick] = useState<PlacePick | null>(null);
  const [served, setServed] = useState<Extract<CheckResult, { status: 'served' }> | null>(null);
  const [notServedBuildingName, setNotServedBuildingName] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waitlisted, setWaitlisted] = useState<{ normalizedAddress: string | null } | null>(null);

  async function checkAddress(picked: PlacePick) {
    setPick(picked);
    setStage('checking');
    setError(null);

    try {
      const res = await fetch('/api/building-address-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          placeId: picked.placeId || undefined,
          formattedAddress:
            picked.formattedAddress || [picked.mainText, picked.secondaryText].filter(Boolean).join(', '),
          displayName: picked.mainText,
          lat: picked.lat,
          lng: picked.lng,
          sourcePage: pathname,
        }),
      });
      const data = (await res.json()) as CheckResult | { error: string };

      if (!res.ok || 'error' in data) {
        setError('error' in data ? data.error : 'Could not check that address.');
        setStage('error');
        return;
      }

      if (data.status === 'served') {
        setServed(data);
        setStage('served');
        return;
      }

      setNotServedBuildingName(data.building?.name ?? null);
      setStage('need-email');
    } catch {
      setError('Network error. Try again.');
      setStage('error');
    }
  }

  async function joinWaitlist() {
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email');
      return;
    }
    setEmailError(null);
    setStage('saving');
    setError(null);

    try {
      const res = await fetch('/api/building-address-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          placeId: pick?.placeId || undefined,
          formattedAddress:
            pick?.formattedAddress || [pick?.mainText, pick?.secondaryText].filter(Boolean).join(', '),
          displayName: pick?.mainText,
          lat: pick?.lat,
          lng: pick?.lng,
          email,
          sourcePage: pathname,
        }),
      });
      const data = (await res.json()) as CheckResult | { error: string };

      if (!res.ok || 'error' in data) {
        setError('error' in data ? data.error : 'Could not save. Try again.');
        setStage('need-email');
        return;
      }

      if (data.status === 'waitlisted') {
        setWaitlisted({ normalizedAddress: data.normalizedAddress });
        setStage('waitlisted');
        return;
      }

      // Address resolved to "served" between the two calls (rare race) — treat
      // it as a win rather than an error.
      if (data.status === 'served') {
        setServed(data);
        setStage('served');
      }
    } catch {
      setError('Network error. Try again.');
      setStage('need-email');
    }
  }

  function reset() {
    setStage('address');
    setPick(null);
    setServed(null);
    setNotServedBuildingName(null);
    setEmail('');
    setEmailError(null);
    setError(null);
    setWaitlisted(null);
  }

  return (
    <div className={`card w-full max-w-md p-6 text-left sm:p-7 ${className}`}>
      <h3 className="font-display text-lg font-semibold text-ink-100 sm:text-xl">{title}</h3>

      {stage === 'address' || stage === 'checking' ? (
        <div className="mt-4">
          <PlacesAutocomplete onPick={checkAddress} disabled={stage === 'checking'} />
          {stage === 'checking' ? (
            <p className="mt-3 text-sm text-ink-400">Checking this address…</p>
          ) : null}
        </div>
      ) : null}

      {stage === 'served' && served ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed text-ink-200">
            <span className="font-medium text-gleam">{served.building.name}</span> is on Lavo. Continue
            to set up your account and see wash day pricing.
          </p>
          <Link href={served.redirectUrl} className="btn-primary block w-full py-3 text-center text-sm">
            Continue to signup
          </Link>
        </div>
      ) : null}

      {stage === 'need-email' || stage === 'saving' ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-ink-300">
            {notServedBuildingName
              ? `${notServedBuildingName} isn't on Lavo yet. Leave your email and we'll reach out the moment it's live.`
              : "That address isn't on Lavo yet. Leave your email and we'll reach out the moment it's live."}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              className="field flex-1"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              disabled={stage === 'saving'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') joinWaitlist();
              }}
            />
            <button
              type="button"
              className="btn-primary shrink-0 px-5 py-2.5 text-sm disabled:opacity-60"
              onClick={joinWaitlist}
              disabled={stage === 'saving'}
            >
              {stage === 'saving' ? 'Saving…' : 'Join waitlist'}
            </button>
          </div>
          {emailError ? <p className="text-sm text-red-400">{emailError}</p> : null}
        </div>
      ) : null}

      {stage === 'waitlisted' ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm leading-relaxed text-gleam">You&apos;re on the list.</p>
          <p className="text-sm text-ink-400">
            {waitlisted?.normalizedAddress ?? "We'll email you the moment your building goes live."}
          </p>
          <button type="button" className="btn-quiet mt-2 text-sm" onClick={reset}>
            Check another address
          </button>
        </div>
      ) : null}

      {stage === 'error' ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-red-400">{error}</p>
          <button type="button" className="btn-quiet text-sm" onClick={reset}>
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
