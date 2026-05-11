'use client';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ReviewForm({ washId, operatorId }: { washId: string; operatorId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const sb = supabaseBrowser();
    const { data: wash } = await sb
      .from('washes')
      .select('resident_id')
      .eq('id', washId)
      .single();

    await sb.from('wash_reviews').insert({
      wash_id: washId,
      resident_id: wash!.resident_id,
      operator_id: operatorId,
      rating,
      comment,
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => setRating(n)}
            className={`text-xl ${n <= rating ? 'text-gleam' : 'text-ink-500'}`}
          >★</button>
        ))}
      </div>
      <input
        className="field"
        placeholder="Optional comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button disabled={busy} className="btn-ghost self-start">
        {busy ? 'Saving…' : 'Submit review'}
      </button>
    </form>
  );
}
