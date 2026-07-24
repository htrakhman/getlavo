'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { money } from '@/lib/format';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Pkg = { id?: string; name: string; description: string; price_cents: number };

interface Initial {
  operatorId: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string;
  basePriceCents: number | null;
  hoursJson: Record<string, { open?: string; close?: string; closed?: boolean }> | null;
  washDays: string[];
  packages: Pkg[];
  insuranceApproved: boolean;
  insuranceOnFile: boolean;
}

function Blank({ label }: { label: string }) {
  return <span className="font-medium text-[#c0392b]">[ {label} ]</span>;
}

export function AgreementBuilder({ initial, pdfHref }: { initial: Initial; pdfHref: string }) {
  const router = useRouter();

  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.contactPhone);
  const [price, setPrice] = useState(initial.basePriceCents ? (initial.basePriceCents / 100).toFixed(2) : '');
  const [washDays, setWashDays] = useState<Set<string>>(new Set(initial.washDays));
  const [packages, setPackages] = useState<Pkg[]>(initial.packages);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [newPkg, setNewPkg] = useState<{ name: string; price: string }>({ name: '', price: '' });

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);

  const basePriceCents = Math.round((parseFloat(price) || 0) * 100);
  const orderedDays = DAYS.filter((d) => washDays.has(d));
  const activePackages = packages.filter((p) => !p.id || !removedIds.includes(p.id));

  const requirements = useMemo(
    () => [
      { key: 'name', label: 'Business name', done: !!name.trim() },
      { key: 'schedule', label: 'Wash days & hours', done: orderedDays.length > 0 },
      { key: 'price', label: 'Base price per wash', done: basePriceCents > 0 },
      { key: 'packages', label: 'At least one service package', done: activePackages.length > 0 },
    ],
    [name, orderedDays.length, basePriceCents, activePackages.length],
  );
  const canSend = requirements.every((r) => r.done);

  const dirty =
    name !== initial.name ||
    phone !== initial.contactPhone ||
    basePriceCents !== (initial.basePriceCents ?? 0) ||
    orderedDays.join(',') !== initial.washDays.join(',') ||
    removedIds.length > 0 ||
    packages.some((p) => !p.id);

  function toggleDay(d: string) {
    setWashDays((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  }

  function addPackage() {
    const cents = Math.round((parseFloat(newPkg.price) || 0) * 100);
    if (!newPkg.name.trim() || cents <= 0) return;
    setPackages((p) => [...p, { name: newPkg.name.trim(), description: '', price_cents: cents }]);
    setNewPkg({ name: '', price: '' });
  }

  function removePackage(pkg: Pkg, idx: number) {
    if (pkg.id) setRemovedIds((r) => [...r, pkg.id!]);
    else setPackages((p) => p.filter((_, i) => i !== idx));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();

    const hours_json = Object.fromEntries(
      DAYS.map((d) => {
        const src = initial.hoursJson?.[d] ?? {};
        return [d, { open: src.open ?? '08:00', close: src.close ?? '17:00', closed: !washDays.has(d) }];
      }),
    );

    const { error: opErr } = await sb
      .from('operators')
      .update({
        name: name.trim(),
        contact_phone: phone.trim() || null,
        base_price_cents: basePriceCents > 0 ? basePriceCents : null,
        hours_json,
      })
      .eq('id', initial.operatorId);
    if (opErr) { setBusy(false); setErr(opErr.message); return; }

    // New packages → insert. Removed existing packages → soft-delete (active:false).
    const inserts = packages
      .filter((p) => !p.id)
      .map((p) => ({ operator_id: initial.operatorId, name: p.name, description: p.description || null, price_cents: p.price_cents, size_prices: [], est_minutes: null, active: true }));
    if (inserts.length) {
      const { error } = await sb.from('service_packages').insert(inserts);
      if (error) { setBusy(false); setErr(error.message); return; }
    }
    if (removedIds.length) {
      const { error } = await sb.from('service_packages').update({ active: false }).in('id', removedIds);
      if (error) { setBusy(false); setErr(error.message); return; }
    }

    // Resync package state with the DB so freshly-inserted rows carry their ids
    // (prevents a second save from re-inserting them).
    const { data: fresh } = await sb
      .from('service_packages')
      .select('id, name, description, price_cents')
      .eq('operator_id', initial.operatorId)
      .eq('active', true)
      .order('display_order');
    setPackages((fresh ?? []).map((p: any) => ({ id: p.id, name: p.name, description: p.description ?? '', price_cents: p.price_cents })));
    setRemovedIds([]);

    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  }

  return (
    <div className="mb-8 space-y-4">
      {/* Readiness banner */}
      <div className={`rounded-xl border px-5 py-4 ${canSend ? 'border-gleam/30 bg-gleam/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium text-ink-100">
              {canSend ? 'Your agreement is ready to send ✓' : 'Fill in the required fields to send an agreement'}
            </div>
            <p className="mt-0.5 text-sm text-ink-400">
              Edit below and the document updates live. Saving syncs it to your profile everywhere.
            </p>
          </div>
          <div className="relative flex items-center gap-2">
            {dirty && (
              <button onClick={save} disabled={busy} className="btn-primary text-sm">
                {busy ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
              </button>
            )}
            <button onClick={() => setDownloadOpen((o) => !o)} className="btn-quiet text-sm">
              Download ▾
            </button>
            {downloadOpen && (
              <div className="card absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden p-0 shadow-xl">
                <a href={pdfHref} target="_blank" rel="noreferrer" onClick={() => setDownloadOpen(false)} className="block px-4 py-3 text-sm text-ink-100 transition hover:bg-gleam/10">
                  <div className="font-medium">Filled in</div>
                  <div className="text-xs text-ink-400">Your saved details merged in</div>
                </a>
                <a href={`${pdfHref}?blank=1`} target="_blank" rel="noreferrer" onClick={() => setDownloadOpen(false)} className="block border-t border-white/10 px-4 py-3 text-sm text-ink-100 transition hover:bg-gleam/10">
                  <div className="font-medium">Blank template</div>
                  <div className="text-xs text-ink-400">Empty agreement to fill by hand</div>
                </a>
              </div>
            )}
          </div>
        </div>

        <ul className="mt-4 flex flex-wrap gap-2">
          {requirements.map((r) => (
            <li key={r.key}>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${r.done ? 'bg-gleam/10 text-gleam' : 'bg-red-500/10 text-red-500'}`}>
                {r.done ? '✓' : '○'} {r.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Live document preview — a real paper document. Uses literal colours
          (not the theme "white"/"ink" tokens, which remap to a dark contrast
          colour) and a serif face so it reads like a standard legal PDF. */}
      <div className="overflow-x-auto rounded-lg border border-[#d9dbe0] bg-[#e9eaee] p-4 shadow-sm sm:p-8">
        <div
          className="mx-auto max-w-[720px] bg-[#ffffff] px-8 py-12 text-[#1f2328] shadow-[0_1px_3px_rgba(0,0,0,0.12),0_10px_40px_-12px_rgba(0,0,0,0.25)] sm:px-14"
          style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
        >
          {/* Letterhead */}
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0a7d70]" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>Lavo</div>
            <h2 className="mt-3 text-[22px] font-bold leading-tight text-[#111418]">Car Wash Service Agreement</h2>
            <div className="mx-auto mt-4 h-px w-14 bg-[#111418]" />
          </div>

          <div className="mt-9 space-y-6 text-[14px] leading-7 text-[#26292e]">
            <p className="text-justify text-[#3a3f45]">
              This Service Agreement (the &ldquo;Agreement&rdquo;) is entered into as of the effective date by and
              between the Building Manager and the Service Provider identified below.
            </p>

            <section>
              <h3 className="mb-2 text-[15px] font-bold text-[#111418]">1. Parties</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>Building Manager</div>
                  <div className="mt-1 text-[#555b63]">The building you send this to.</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>Service Provider</div>
                  <div className="mt-1 font-semibold text-[#111418]">{name.trim() || <Blank label="Business name" />}</div>
                  {initial.contactEmail && <div className="text-[13px] text-[#555b63]">{initial.contactEmail}</div>}
                  {phone.trim() && <div className="text-[13px] text-[#555b63]">{phone}</div>}
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-[15px] font-bold text-[#111418]">2. Services</h3>
              <p className="text-justify">
                Service Provider shall provide car wash services on a{' '}
                {orderedDays.length ? <strong className="font-semibold">{orderedDays.join(', ')}</strong> : <Blank label="wash days" />}{' '}
                schedule, weekly or as otherwise agreed through the Lavo scheduling tool, at the building&rsquo;s
                designated wash area. Service packages offered to residents:
              </p>
              <table className="mt-3 w-full border-collapse text-[13px]">
                <tbody>
                  {activePackages.length ? (
                    activePackages.map((p, i) => (
                      <tr key={p.id ?? `new-${i}`} className="border-b border-dotted border-[#c9ccd2]">
                        <td className="py-1.5 pr-4 text-[#26292e]">{p.name}</td>
                        <td className="py-1.5 text-right font-semibold text-[#111418]">{money(p.price_cents)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td className="py-1.5"><Blank label="service packages" /></td></tr>
                  )}
                </tbody>
              </table>
            </section>

            <section>
              <h3 className="mb-2 text-[15px] font-bold text-[#111418]">3. Fees &amp; Payment</h3>
              <p className="text-justify">
                Residents pay Service Provider directly per wash via the Lavo platform; the Building Manager
                incurs no per-wash charge. The standard base price per resident wash is{' '}
                {basePriceCents > 0 ? <strong className="font-semibold">{money(basePriceCents)}</strong> : <Blank label="base price" />}.
              </p>
            </section>

            <section>
              <h3 className="mb-2 text-[15px] font-bold text-[#111418]">4. Term</h3>
              <p className="text-justify">
                This Agreement begins on the effective date and continues for an initial pilot period of ninety
                (90) days, after which it renews automatically on a month-to-month basis unless either party
                provides thirty (30) days&rsquo; written notice of termination.
              </p>
            </section>

            <section>
              <h3 className="mb-2 text-[15px] font-bold text-[#111418]">5. Insurance</h3>
              <p className="text-justify">
                Service Provider shall maintain general liability insurance of no less than $1,000,000 per
                occurrence throughout the term.{' '}
                {initial.insuranceApproved ? (
                  <span className="font-medium text-[#0a7d70]">A current policy is on file.</span>
                ) : initial.insuranceOnFile ? (
                  <span className="font-medium text-[#b26a00]">Certificate uploaded — pending review.</span>
                ) : (
                  <span className="italic text-[#555b63]">Proof of insurance to be provided prior to the first service date.</span>
                )}
              </p>
            </section>

            <section>
              <h3 className="mb-2 text-[15px] font-bold text-[#111418]">6. Limitation of Liability</h3>
              <p className="text-justify">
                Service Provider&rsquo;s liability for any single incident is limited to the retail value of the
                service rendered. Lavo acts as a platform intermediary and is not a party to the service
                relationship.
              </p>
            </section>

            <section>
              <h3 className="mb-2 text-[15px] font-bold text-[#111418]">7. Governing Law</h3>
              <p className="text-justify">
                This Agreement shall be governed by the laws of the State in which the building is located,
                without regard to its conflict of law principles.
              </p>
            </section>

            <div className="grid grid-cols-1 gap-8 border-t border-[#d9dbe0] pt-8 sm:grid-cols-2">
              <div>
                <div className="h-8 border-b border-[#111418]" />
                <div className="mt-1 text-[12px] text-[#555b63]">Building Manager</div>
              </div>
              <div>
                <div className="flex h-8 items-end border-b border-[#111418] pb-1 font-semibold text-[#111418]">{name.trim() || ''}</div>
                <div className="mt-1 text-[12px] text-[#555b63]">Service Provider</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor — the duplicate fill-in section */}
      <div className="rounded-2xl border border-ink-200/20 bg-white/5 p-6">
        <h3 className="font-display text-lg text-ink-100">Fill out your agreement</h3>
        <p className="mt-0.5 text-sm text-ink-400">Everything here saves to your profile and updates the preview above.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label">Business name</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your business name" />
          </div>
          <div>
            <label className="label">Contact phone (optional)</label>
            <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
          </div>
          <div>
            <label className="label">Base price per wash ($)</label>
            <input className="field" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="35" />
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Wash days</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${washDays.has(d) ? 'bg-gleam text-black' : 'bg-black/5 text-ink-300 hover:bg-black/10'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Service packages</label>
          <div className="mt-1 space-y-2">
            {activePackages.map((p, i) => (
              <div key={p.id ?? `new-${i}`} className="flex items-center justify-between rounded-lg border border-ink-200/20 px-3 py-2 text-sm">
                <span className="text-ink-100">{p.name} · <span className="text-gleam">{money(p.price_cents)}</span></span>
                <button type="button" onClick={() => removePackage(p, packages.indexOf(p))} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ))}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[140px]">
                <input className="field" value={newPkg.name} onChange={(e) => setNewPkg((n) => ({ ...n, name: e.target.value }))} placeholder="Package name (e.g. Standard wash)" />
              </div>
              <div className="w-28">
                <input className="field" inputMode="decimal" value={newPkg.price} onChange={(e) => setNewPkg((n) => ({ ...n, price: e.target.value }))} placeholder="Price $" />
              </div>
              <button type="button" onClick={addPackage} className="btn-quiet text-sm">+ Add</button>
            </div>
            <p className="text-xs text-ink-500">
              Need size-based pricing or descriptions? <Link href="/operator/profile" className="text-gleam hover:underline">Manage packages in Profile →</Link>
            </p>
          </div>
        </div>

        {err && <div className="mt-4 text-sm text-red-400">{err}</div>}

        <div className="mt-5 flex items-center gap-3">
          <button onClick={save} disabled={busy || !dirty} className="btn-primary text-sm disabled:opacity-50">
            {busy ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
          </button>
          {!canSend && <span className="text-xs text-amber-600">Complete the required fields to send an agreement.</span>}
        </div>
      </div>
    </div>
  );
}
