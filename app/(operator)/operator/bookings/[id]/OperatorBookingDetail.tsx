'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { money, dateShort } from '@/lib/format';

export function OperatorBookingDetail({
  booking,
}: {
  booking: {
    id: string;
    scheduled_for: string;
    time_slot: string | null;
    status: string;
    gross_cents: number;
    pre_wash_photo_urls: string[] | null;
    post_wash_photo_urls: string[] | null;
    building: { name: string } | null;
    resident: { profile: { full_name: string | null } | null } | null;
    vehicle: { make: string; model: string; color: string; license_plate: string } | null;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pre = Array.isArray(booking.pre_wash_photo_urls) ? booking.pre_wash_photo_urls : [];
  const post = Array.isArray(booking.post_wash_photo_urls) ? booking.post_wash_photo_urls : [];

  async function upload(kind: 'pre' | 'post', file: File | null) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.set('photo', file);
    fd.set('kind', kind);
    const res = await fetch(`/api/bookings/${booking.id}/photos`, { method: 'POST', body: fd });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(j.error ?? 'Upload failed');
      return;
    }
    router.refresh();
  }

  async function complete() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/bookings/${booking.id}/complete`, { method: 'POST' });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(j.error ?? 'Could not complete');
      return;
    }
    router.push('/operator/bookings');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-6">
        <div className="text-xs uppercase tracking-widest text-ink-500">Booking</div>
        <h1 className="font-display text-2xl mt-1">{booking.building?.name ?? 'Wash'}</h1>
        <p className="text-sm text-ink-400 mt-2">
          {dateShort(booking.scheduled_for)}
          {booking.time_slot ? ` · ${booking.time_slot}` : ''} · {money(booking.gross_cents)} · {booking.status}
        </p>
        <p className="text-sm text-ink-300 mt-3">
          {booking.resident?.profile?.full_name ?? 'Resident'}
          {booking.vehicle
            ? ` · ${booking.vehicle.color} ${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.license_plate})`
            : ''}
        </p>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-display text-lg">Photo proof</h2>
        <p className="text-xs text-ink-500">Upload at least one pre-wash and one post-wash photo before marking complete.</p>

        <div>
          <div className="text-sm font-medium text-ink-200 mb-2">Pre-wash ({pre.length})</div>
          <input
            type="file"
            accept="image/*"
            className="text-sm text-ink-400"
            disabled={busy}
            onChange={(e) => upload('pre', e.target.files?.[0] ?? null)}
          />
          {pre.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-gleam break-all">
              {pre.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noreferrer" className="hover:underline">
                    {u.slice(-40)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="text-sm font-medium text-ink-200 mb-2">Post-wash ({post.length})</div>
          <input
            type="file"
            accept="image/*"
            className="text-sm text-ink-400"
            disabled={busy}
            onChange={(e) => upload('post', e.target.files?.[0] ?? null)}
          />
          {post.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-gleam break-all">
              {post.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noreferrer" className="hover:underline">
                    {u.slice(-40)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {err && <div className="text-sm text-red-400">{err}</div>}

      {booking.status !== 'completed' && (
        <button type="button" disabled={busy} onClick={complete} className="btn-primary">
          {busy ? 'Working…' : 'Mark wash complete'}
        </button>
      )}
    </div>
  );
}
