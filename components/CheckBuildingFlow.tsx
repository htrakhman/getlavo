'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PlacesAutocomplete } from '@/components/PlacesAutocomplete';
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

  async function resolveByPlaceId(placeId: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/building-funnel/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, sessionToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === 'string' ? data.error : 'Could not look up address');
        setMatch(null);
        return;
      }
      setMatch(data as Match);
      await fetch('/api/building-funnel/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingCandidateKey: data.candidateKey,
          placeId: data.place?.placeId,
          formattedAddress: data.place?.formattedAddress,
          buildingName: data.place?.displayName,
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
          <PlacesAutocomplete onPickPlaceId={resolveByPlaceId} disabled={busy} />
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

type Contact = { phone?: string; website?: string; email?: string; aiSummary?: string };

function BranchB({ m }: { m: MatchB }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [unit, setUnit] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');
  const [mgmtEmail, setMgmtEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [contactBusy, setContactBusy] = useState(true);
  const [aiTried, setAiTried] = useState(false);

  const buildingName = m.building?.name ?? m.place.displayName ?? 'My building';
  const buildingId = m.building?.id ?? null;
  const placeId = m.place.placeId;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setContactBusy(true);
      try {
        const res = await fetch('/api/building-funnel/contact-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeId,
            buildingName,
            formattedAddress: m.place.formattedAddress,
            useAi: false,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        setContact(data);
        if (data?.email && !mgmtEmail) setMgmtEmail(data.email);
      } catch {
        if (!cancelled) setContact({});
      } finally {
        if (!cancelled) setContactBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

  async function findWithAi() {
    setAiTried(true);
    setContactBusy(true);
    try {
      const res = await fetch('/api/building-funnel/contact-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          buildingName,
          formattedAddress: m.place.formattedAddress,
          useAi: true,
        }),
      });
      const data = (await res.json()) as Contact;
      setContact(data);
      if (data?.email && !mgmtEmail) setMgmtEmail(data.email);
    } catch {
      // ignore
    } finally {
      setContactBusy(false);
    }
  }

  async function saveLead() {
    await fetch('/api/building-funnel/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buildingCandidateKey: m.candidateKey,
        buildingId,
        buildingName,
        placeId,
        formattedAddress: m.place.formattedAddress,
        residentName: name,
        residentEmail: email,
        residentPhone: phone,
        unit,
        vehicle: { make, model, color, plate },
      }),
    }).catch(() => {});
  }

  async function emailMgmt() {
    setMsg(null);
    await saveLead();
    const res = await fetch('/api/building-funnel/email-mgmt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mgmtEmail,
        buildingName,
        residentName: name || 'A resident',
        residentEmail: email,
        buildingCandidateKey: m.candidateKey,
        placeId,
      }),
    });
    if (res.ok) setMsg('Sent. Your property team has the request.');
    else setMsg('Could not send. Try again or share the link instead.');
  }

  async function makeShare() {
    const res = await fetch('/api/building-share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingCandidateKey: m.candidateKey, buildingId }),
    });
    const data = await res.json();
    if (data.url) setShareUrl(data.url);
  }

  async function waitlist() {
    setMsg(null);
    await saveLead();
    const res = await fetch('/api/building-waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buildingCandidateKey: m.candidateKey,
        buildingId,
        email,
        phone,
        fullName: name,
        formattedAddress: m.place.formattedAddress,
        buildingName,
        placeId,
      }),
    });
    if (res.ok) {
      setMsg('You are on the list. We text and email the moment Lavo turns on for this address. You get a free first wash credit valid 14 days after activation.');
    } else setMsg('Could not save. Check email or phone.');
  }

  return (
    <div className="card space-y-5 p-6">
      <div>
        <h3 className="font-display text-2xl">Your building isn&apos;t on Lavo yet.</h3>
        <p className="mt-2 text-sm text-ink-300">Be the reason it is. {m.requestCount > 0 && <span className="text-gleam">{m.requestCount} neighbors already raised their hand.</span>}</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="text-xs uppercase tracking-widest text-ink-500">Reach your management</div>
        {contactBusy ? (
          <p className="text-sm text-ink-400">Looking up contact info…</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {contact?.phone ? (
                <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="btn-primary px-4 py-2 text-sm">
                  Call {contact.phone}
                </a>
              ) : (
                !aiTried && (
                  <button type="button" className="btn-quiet px-4 py-2 text-sm" onClick={findWithAi}>
                    Find with AI ✨
                  </button>
                )
              )}
              {contact?.website && (
                <a href={contact.website} target="_blank" rel="noreferrer" className="btn-quiet px-4 py-2 text-sm">
                  Visit website
                </a>
              )}
            </div>
            {!contact?.phone && aiTried && (
              <p className="text-xs text-ink-500">
                Couldn&apos;t find a phone for this building. Try the email path below or share the neighbor link.
              </p>
            )}
            {contact?.aiSummary && <p className="text-xs text-ink-500">{contact.aiSummary}</p>}
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-ink-100 outline-none ring-gleam/40 focus:ring-2" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-ink-100 outline-none ring-gleam/40 focus:ring-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-ink-100 outline-none ring-gleam/40 focus:ring-2" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-ink-100 outline-none ring-gleam/40 focus:ring-2" placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <input className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-ink-100 outline-none ring-gleam/40 focus:ring-2" placeholder="Vehicle make" value={make} onChange={(e) => setMake(e.target.value)} />
        <input className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-ink-100 outline-none ring-gleam/40 focus:ring-2" placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} />
        <input className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-ink-100 outline-none ring-gleam/40 focus:ring-2" placeholder="Color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-ink-100 outline-none ring-gleam/40 focus:ring-2" placeholder="Plate (optional)" value={plate} onChange={(e) => setPlate(e.target.value)} />
      </div>
      <div className="space-y-3 border-t border-white/10 pt-4">
        <div className="text-xs uppercase tracking-widest text-ink-500">Email my management</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="flex-1 min-w-0 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-ink-100 outline-none ring-gleam/40 focus:ring-2"
            placeholder="Property manager email"
            value={mgmtEmail}
            onChange={(e) => setMgmtEmail(e.target.value)}
          />
          {!mgmtEmail && !contactBusy && !aiTried && (
            <button type="button" className="btn-quiet px-3 py-2 text-xs" onClick={findWithAi}>
              Find with AI ✨
            </button>
          )}
        </div>
        <button type="button" className="btn-primary w-full py-3 text-sm" onClick={() => emailMgmt()}>
          Send request email
        </button>
      </div>
      <div className="space-y-2 border-t border-white/10 pt-4">
        <div className="text-xs uppercase tracking-widest text-ink-500">Share with neighbors</div>
        <button type="button" className="btn-quiet w-full py-3 text-sm" onClick={() => makeShare()}>
          Create neighbor link
        </button>
        {shareUrl && <NeighborShare url={shareUrl} />}
      </div>
      <div className="border-t border-white/10 pt-4">
        <button type="button" className="btn-primary w-full py-3 text-sm" onClick={() => waitlist()}>
          Notify me when my building joins
        </button>
      </div>
      {msg && <p className="text-sm text-gleam">{msg}</p>}
    </div>
  );
}

function NeighborShare({ url }: { url: string }) {
  const text = encodeURIComponent(`We're trying to get Lavo car washes at our building. Add your name: ${url}`);
  return (
    <div className="flex flex-wrap gap-2">
      <a className="btn-quiet px-3 py-2 text-xs" href={`sms:&body=${text}`}>
        SMS
      </a>
      <a className="btn-quiet px-3 py-2 text-xs" href={`https://wa.me/?text=${text}`} target="_blank" rel="noreferrer">
        WhatsApp
      </a>
      <button
        type="button"
        className="btn-quiet px-3 py-2 text-xs"
        onClick={() => navigator.clipboard.writeText(url).catch(() => {})}
      >
        Copy link
      </button>
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
