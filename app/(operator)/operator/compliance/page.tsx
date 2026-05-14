'use client';

import { useState } from 'react';

export default function OperatorCompliancePage() {
  const [insurer, setInsurer] = useState('');
  const [policy, setPolicy] = useState('');
  const [limits, setLimits] = useState('');
  const [expires, setExpires] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [ai, setAi] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    const res = await fetch('/api/operator/coi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        insurerName: insurer,
        policyNumber: policy,
        coverageLimits: limits,
        expiresAt: expires,
        fileUrl,
        additionalInsuredOk: ai,
      }),
    });
    setMsg(res.ok ? 'Saved. Admin reviews before you go live.' : 'Could not save');
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10 space-y-4">
      <h1 className="font-display text-3xl">COI on file</h1>
      <p className="text-sm text-ink-400">General liability and commercial auto. Additional insured wording must name partnered buildings.</p>
      <input className="field" placeholder="Insurer name" value={insurer} onChange={(e) => setInsurer(e.target.value)} />
      <input className="field" placeholder="Policy number" value={policy} onChange={(e) => setPolicy(e.target.value)} />
      <input className="field" placeholder="Coverage limits summary" value={limits} onChange={(e) => setLimits(e.target.value)} />
      <input className="field" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      <input className="field" placeholder="Certificate PDF URL (upload to storage first)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
      <label className="flex items-center gap-2 text-sm text-ink-300">
        <input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} />
        Additional insured endorsement is on the COI
      </label>
      <button type="button" className="btn-primary" onClick={() => save()}>
        Save COI
      </button>
      {msg && <p className="text-sm text-gleam">{msg}</p>}
    </main>
  );
}
