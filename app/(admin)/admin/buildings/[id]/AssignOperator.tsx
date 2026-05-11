'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AssignOperator({ buildingId, operators }: { buildingId: string; operators: any[] }) {
  const router = useRouter();
  const [opId, setOpId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function assign() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/admin/assign-operator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId, operatorId: opId }),
    });
    setBusy(false);
    if (!res.ok) { setErr('Failed'); return; }
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <select className="field flex-1" value={opId} onChange={(e) => setOpId(e.target.value)}>
        <option value="">Select operator…</option>
        {operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <button onClick={assign} disabled={!opId || busy} className="btn-primary text-sm">Assign</button>
      {err && <div className="text-sm text-red-400">{err}</div>}
    </div>
  );
}
