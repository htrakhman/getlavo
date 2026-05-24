'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PlacesAutocomplete, type PlacePick } from '@/components/PlacesAutocomplete';
import { BuildingRequestForm } from '@/components/BuildingRequestForm';
import { BuildingPendingOperatorPanel } from '@/components/BuildingPendingOperatorPanel';
import { money } from '@/lib/format';

type Place = { placeId?: string; formattedAddress: string; displayName: string };

type MatchA = {
  branch: 'A';
  candidateKey: string;
  place: Place;
  building: { id: string; name: string; slug: string; wash_day?: string | null };
  operator: { id: string; name: string; description?: string | null } | null;
  packages: { id: string; name: string; description?: string | null; price_cents: number; est_minutes?: number | null }[];
  requestCount: number;
};

type MatchB = {
  branch: 'B';
  candidateKey: string;
  place: Place;
  building: { id: string; name: string; slug: string } | null;
  pendingOperator?: boolean;
  operator: unknown;
  packages: unknown[];
  requestCount: number;
};

type MatchC = { branch: 'C'; candidateKey: string; place: Place };

type Match = MatchA | MatchB | MatchC;

export function CheckBuildingFlow() {
  const sessionToken = useMemo(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`), []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);

  async function resolveByPick(pick: PlacePick) {
    setBusy(true);
    setErr(null);
    try {
      const fallbackAddress =
        pick.formattedAddress || [pick.mainText, pick.secondaryText].filter(Boolean).join(', ');
      const payload: Record<string, unknown> = {
        sessionToken,
        displayName: pick.mainText,
      };
      if (pick.placeId) payload.placeId = pick.placeId;
      if (fallbackAddress) payload.formattedAddress = fallbackAddress;
      if (typeof pick.lat === 'number') payload.lat = pick.lat;
      if (typeof pick.lng === 'number') payload.lng = pick.lng;

      const res = await fetch('/api/building-funnel/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === 'string' ? data.error : 'Could not look up address');
        setMatch(null);
        return;
      }
      const resolved = data as Match;
      setMatch(resolved);
      await fetch('/api/building-funnel/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingCandidateKey: resolved.candidateKey,
          buildingId: resolved.branch !== 'C' && resolved.building ? resolved.building.id : undefined,
          placeId: resolved.place.placeId,
          formattedAddress: resolved.place.formattedAddress,
          buildingName:
            (resolved.branch !== 'C' && resolved.building ? resolved.building.name : null) ||
            resolved.place.displayName,
          channel: 'check_flow',
        }),
      }).catch(() => {});
    } catch {
      setErr('Network error');
      setMatch(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 text-left">
      {!match && (
        <>
          <PlacesAutocomplete onPick={resolveByPick} disabled={busy} />
          {busy && <p className="text-sm text-ink-500">Checking this address on Lavo…</p>}
          {err && <p className="text-sm text-red-400">{err}</p>}
        </>
      )}

      {match?.branch === 'A' && <BranchA m={match} />}
      {match?.branch === 'B' && <BranchB m={match} />}
      {match?.branch === 'C' && <BranchC m={match} />}
    </div>
  );
}

function BranchA({ m }: { m: MatchA }) {
  const slug = m.building.slug;
  return (
    <div className="card space-y-5 p-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-gleam">Your building is on Lavo</div>
        <h3 className="mt-2 font-display text-2xl">{m.building.name}</h3>
        <p className="mt-1 text-sm text-ink-400">{m.place.formattedAddress}</p>
      </div>
      {m.operator && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs text-ink-500">Partnered operator</div>
          <div className="font-medium text-ink-100">{m.operator.name}</div>
          {m.operator.description && <p className="mt-1 text-sm text-ink-400">{m.operator.description}</p>}
        </div>
      )}
      <div>
        <div className="text-xs uppercase tracking-widest text-ink-500">Next wash day</div>
        <div className="mt-1 font-display text-xl">{m.building.wash_day ? `Every ${m.building.wash_day}` : 'See app for schedule'}</div>
      </div>
      {m.packages.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-ink-500 mb-2">Sample pricing</div>
          <ul className="space-y-2">
            {m.packages.slice(0, 3).map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <span>{p.name}</span>
                <span className="text-gleam">{money(p.price_cents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm text-ink-300">
        First wash promo applies automatically when you finish signup. Code FIRSTWASH is on your first booking checkout if needed.
      </p>
      <Link href={`/signup?role=resident&building=${encodeURIComponent(slug)}&promo=FIRSTWASH`} className="btn-primary block w-full py-4 text-center text-base">
        Continue to signup
      </Link>
      <Link href={`/login?building=${encodeURIComponent(slug)}`} className="btn-quiet block w-full py-3 text-center text-sm">
        I already have an account
      </Link>
    </div>
  );
}

function BranchB({ m }: { m: MatchB }) {
  const defaultBuildingLabel =
    m.building?.name?.trim() ||
    m.place.displayName?.trim() ||
    m.place.formattedAddress?.trim() ||
    '';

  const registeredBuilding = m.pendingOperator && m.building ? m.building : null;

  return (
    <div className="card space-y-6 p-6">
      {registeredBuilding ? (
        <BuildingPendingOperatorPanel
          buildingCandidateKey={m.candidateKey}
          buildingId={registeredBuilding.id}
          buildingName={registeredBuilding.name}
          formattedAddress={m.place.formattedAddress}
          placeId={m.place.placeId}
          requestCount={m.requestCount}
        />
      ) : (
        <>
          {m.requestCount > 0 && (
            <p className="text-sm text-ink-400">
              <span className="text-gleam">
                {m.requestCount} {m.requestCount === 1 ? 'neighbor has' : 'neighbors have'} already requested Lavo here.
              </span>
            </p>
          )}
          <BuildingRequestForm
            buildingCandidateKey={m.candidateKey}
            placeId={m.place.placeId}
            formattedAddress={m.place.formattedAddress}
            defaultBuildingLabel={defaultBuildingLabel}
            buildingId={m.building?.id ?? null}
            registeredBuildingSlug={m.building?.slug ?? null}
          />
        </>
      )}
    </div>
  );
}

function BranchC({ m }: { m: MatchC }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  async function submit() {
    const res = await fetch('/api/homeowner-waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, placeId: m.place.placeId }),
    });
    if (res.ok) setDone(true);
  }

  return (
    <div className="card space-y-4 p-6">
      <h3 className="font-display text-2xl">Lavo is built for apartment residents today.</h3>
      <p className="text-sm text-ink-300">We&apos;re expanding to homeowners soon. Leave your email and we&apos;ll keep you posted.</p>
      <p className="text-xs text-ink-500">{m.place.formattedAddress}</p>
      {done ? (
        <p className="text-sm text-gleam">You are on the list.</p>
      ) : (
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="button" className="btn-primary px-4" onClick={() => submit()}>
            Join
          </button>
        </div>
      )}
    </div>
  );
}
