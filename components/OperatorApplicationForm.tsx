'use client';

import { useState } from 'react';
import Link from 'next/link';

type OperatorApplicationFormProps = {
  defaultServiceArea?: string;
  citySlug?: string;
  source?: string;
};

export function OperatorApplicationForm({
  defaultServiceArea = '',
  citySlug,
  source = 'operators_apply_page',
}: OperatorApplicationFormProps) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceArea, setServiceArea] = useState(defaultServiceArea);
  const [insured, setInsured] = useState(true);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/operator-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          serviceArea: serviceArea.trim(),
          insured,
          notes: notes.trim() || undefined,
          source,
          citySlug: citySlug || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === 'string' ? data.error : 'Could not submit. Try again.');
        return;
      }
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="card p-8 text-center max-w-xl mx-auto">
        <h2 className="font-display text-2xl text-ink-100">Application received</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-300">
          Thanks, <strong className="text-ink-100">{name}</strong>. We&apos;ll review your application and reach out
          at <strong className="text-ink-100">{email}</strong> within two business days.
        </p>
        <p className="mt-4 text-sm text-ink-400">
          Want to get ahead? Create your operator account while we review.
        </p>
        <Link href="/signup?role=operator" className="btn-primary mt-6 inline-block px-8 py-3">
          Continue to signup →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-8 space-y-4 max-w-xl mx-auto">
      <div>
        <h2 className="font-display text-2xl text-ink-100">Operator application</h2>
        <p className="mt-2 text-sm text-ink-400">
          Tell us about your mobile car wash or detailing business. We review every application within 48 hours.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs text-ink-400">Your name *</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-ink-400">Company name *</span>
          <input className="field" value={company} onChange={(e) => setCompany(e.target.value)} required />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs text-ink-400">Work email *</span>
        <input
          className="field"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs text-ink-400">Phone</span>
        <input className="field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs text-ink-400">Service area *</span>
        <input
          className="field"
          placeholder="e.g. Hudson County, NJ — 25 mile radius"
          value={serviceArea}
          onChange={(e) => setServiceArea(e.target.value)}
          required
        />
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={insured}
          onChange={(e) => setInsured(e.target.checked)}
        />
        <span className="text-sm text-ink-300">
          We are a licensed and insured mobile car wash or detailing operation with general liability coverage.
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs text-ink-400">Anything else we should know?</span>
        <textarea
          className="field min-h-[100px] resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Fleet size, current apartment clients, insurance carrier…"
        />
      </label>

      {err ? <p className="text-sm text-red-400">{err}</p> : null}

      <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
        {busy ? 'Sending…' : 'Submit application'}
      </button>

      <p className="text-center text-xs text-ink-500">
        Already approved?{' '}
        <Link href="/signup?role=operator" className="text-gleam hover:underline">
          Sign in or create account
        </Link>
      </p>
    </form>
  );
}
