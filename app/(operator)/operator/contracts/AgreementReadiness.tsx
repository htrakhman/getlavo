'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Requirement {
  key: string;
  label: string;
  done: boolean;
}

interface PreviewData {
  operatorName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  washDaysLabel: string | null;
  basePrice: string | null;
  packages: Array<{ name: string; description?: string | null; price: string }>;
  insuranceApproved: boolean;
  insuranceOnFile: boolean;
  requirements: Requirement[];
}

/** Red placeholder shown in the live preview wherever a required field is still empty. */
function Blank({ label }: { label: string }) {
  return (
    <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs font-medium text-red-500">
      {label} — add in profile
    </span>
  );
}

export function AgreementReadiness({
  data,
  canSend,
  pdfHref,
}: {
  data: PreviewData;
  canSend: boolean;
  pdfHref: string;
}) {
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="mb-8 space-y-4">
      {/* Readiness checklist */}
      <div className={`rounded-xl border px-5 py-4 ${canSend ? 'border-gleam/30 bg-gleam/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium text-ink-100">
              {canSend ? 'Your agreement is ready to send ✓' : 'Finish these before you can send an agreement'}
            </div>
            <p className="mt-0.5 text-sm text-ink-400">
              The agreement auto-fills from your profile. The preview below updates as you complete it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPreview((s) => !s)} className="btn-quiet text-sm">
              {showPreview ? 'Hide preview' : 'Show preview'}
            </button>
            <a href={pdfHref} target="_blank" rel="noreferrer" className="btn-quiet text-sm">
              Open PDF →
            </a>
          </div>
        </div>

        <ul className="mt-4 flex flex-wrap gap-2">
          {data.requirements.map((r) => (
            <li key={r.key}>
              {r.done ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gleam/10 px-3 py-1 text-xs font-medium text-gleam">
                  ✓ {r.label}
                </span>
              ) : (
                <Link
                  href="/operator/profile"
                  className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-500/20"
                >
                  ○ {r.label} →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Live document preview */}
      {showPreview && (
        <div className="overflow-hidden rounded-2xl border border-ink-200/20 bg-white shadow-sm">
          <div className="border-b border-ink-200/20 px-8 py-6 text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-gleam">Lavo</div>
            <h2 className="mt-1 font-display text-2xl text-ink-100">Car Wash Service Agreement</h2>
            <p className="mt-1 text-xs text-ink-400">Live preview · fills in as you complete your profile</p>
          </div>

          <div className="space-y-6 px-8 py-6 text-sm leading-relaxed text-ink-200">
            {/* Parties */}
            <section>
              <h3 className="mb-2 font-display text-base text-ink-100">1. Parties</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-ink-200/20 p-3">
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-ink-400">Building Manager</div>
                  <div className="text-ink-300">The building you send this to</div>
                </div>
                <div className="rounded-lg border border-ink-200/20 p-3">
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-ink-400">Service Provider</div>
                  <div className="font-medium text-ink-100">{data.operatorName || <Blank label="Business name" />}</div>
                  {data.contactEmail && <div className="mt-0.5 text-xs text-ink-400">{data.contactEmail}</div>}
                  {data.contactPhone && <div className="text-xs text-ink-400">{data.contactPhone}</div>}
                </div>
              </div>
            </section>

            {/* Services */}
            <section>
              <h3 className="mb-2 font-display text-base text-ink-100">2. Services</h3>
              <ul className="space-y-1.5">
                <li>
                  <span className="text-ink-400">Scheduled wash days: </span>
                  {data.washDaysLabel ? <strong className="text-ink-100">{data.washDaysLabel}</strong> : <Blank label="Wash days" />}
                </li>
                <li>
                  <span className="text-ink-400">Frequency: </span>
                  <strong className="text-ink-100">Weekly (or as agreed per scheduling tool)</strong>
                </li>
              </ul>

              <div className="mt-3">
                <div className="mb-1 text-ink-400">Service packages:</div>
                {data.packages.length ? (
                  <div className="space-y-1 rounded-lg border border-ink-200/20 p-3">
                    {data.packages.map((p) => (
                      <div key={p.name} className="flex items-center justify-between">
                        <span className="text-ink-200">
                          {p.name}
                          {p.description && <span className="ml-2 text-xs text-ink-400">{p.description}</span>}
                        </span>
                        <span className="text-sm text-gleam">{p.price}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Blank label="Service packages" />
                )}
              </div>
            </section>

            {/* Fees */}
            <section>
              <h3 className="mb-2 font-display text-base text-ink-100">3. Fees &amp; Payment</h3>
              <p className="text-ink-300">
                Residents pay per wash via Lavo. Standard base price per resident wash:{' '}
                {data.basePrice ? <strong className="text-ink-100">{data.basePrice}</strong> : <Blank label="Base price" />}
              </p>
            </section>

            {/* Insurance */}
            <section>
              <h3 className="mb-2 font-display text-base text-ink-100">4. Insurance</h3>
              <p className="text-ink-300">
                General liability of no less than $1,000,000 per occurrence.{' '}
                {data.insuranceApproved ? (
                  <span className="text-gleam">✓ Current policy on file.</span>
                ) : data.insuranceOnFile ? (
                  <span className="text-amber-600">Certificate uploaded — pending review.</span>
                ) : (
                  <span className="text-ink-400">Proof to be provided before first service.</span>
                )}
              </p>
            </section>

            <p className="border-t border-ink-200/20 pt-4 text-xs text-ink-400">
              Term, liability and governing-law clauses are included in full on the signed document.{' '}
              <Link href="/operator/profile" className="text-gleam hover:underline">Edit your details in Profile →</Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
