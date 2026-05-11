'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RateWash({ washId, alreadyRated }: { washId: string; alreadyRated: number | null }) {
  const router = useRouter();
  const [rating, setRating] = useState(alreadyRated ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(!!alreadyRated);

  if (done && rating > 0) {
    return (
      <div className="mt-2 text-xs text-ink-400">
        You rated this {Array.from({ length: rating }).map(() => '★').join('')}{Array.from({ length: 5 - rating }).map(() => '☆').join('')}
      </div>
    );
  }

  async function submit() {
    setBusy(true);
    const res = await fetch(`/api/wash-records/${washId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, comment }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className={`text-xl leading-none ${(hover || rating) >= n ? 'text-gleam' : 'text-ink-500'}`}
            aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
          >★</button>
        ))}
        <span className="ml-2 text-xs text-ink-400">{rating > 0 ? `${rating} of 5` : 'Rate this wash'}</span>
      </div>
      {rating > 0 && (
        <div className="mt-2 flex gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any feedback? (optional)"
            className="field text-xs"
          />
          <button onClick={submit} disabled={busy} className="btn-primary !py-1.5 !px-3 !text-xs">
            {busy ? '…' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  );
}
