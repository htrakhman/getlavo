'use client';

import { useState } from 'react';

export function EnterpriseLeadForm() {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [size, setSize] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/enterprise-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, company, email, portfolioSize: size }),
    });
    setMsg(res.ok ? 'Thanks. Our team will reach out within two business days.' : 'Could not send. Email sales@getlavo.io');
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-3 max-w-xl mx-auto">
      <h3 className="font-display text-xl">Manage a portfolio of buildings?</h3>
      <p className="text-sm text-ink-400">Talk to sales about rollout, reporting, and white-label options.</p>
      <input className="field" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="field" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} required />
      <input className="field" type="email" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="field" placeholder="Approximate portfolio size" value={size} onChange={(e) => setSize(e.target.value)} />
      <button className="btn-primary w-full" type="submit">
        Talk to sales
      </button>
      {msg && <p className="text-sm text-gleam">{msg}</p>}
    </form>
  );
}
