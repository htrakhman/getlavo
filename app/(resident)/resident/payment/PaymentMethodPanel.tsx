'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentMethodCapture } from '@/components/stripe/PaymentMethodCapture';

export function PaymentMethodPanel({ card }: { card: { brand: string; last4: string; exp: string } | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!card);

  return (
    <div className="max-w-xl space-y-4">
      {card && !editing && (
        <div className="card p-6">
          <div className="text-xs uppercase tracking-widest text-ink-400">Card on file</div>
          <div className="mt-2 font-display text-2xl capitalize">{card.brand} •••• {card.last4}</div>
          <div className="mt-1 text-sm text-ink-400">Expires {card.exp}</div>
          <button onClick={() => setEditing(true)} className="btn-quiet mt-4 text-sm">Replace card</button>
        </div>
      )}

      {editing && (
        <div className="card p-6">
          <h3 className="font-display text-lg mb-3">{card ? 'Replace your card' : 'Add a card'}</h3>
          <PaymentMethodCapture
            buttonLabel={card ? 'Replace card' : 'Save card'}
            onSaved={() => {
              setEditing(false);
              router.refresh();
            }}
          />
          {card && (
            <button onClick={() => setEditing(false)} className="btn-quiet mt-3 w-full text-sm">Cancel</button>
          )}
        </div>
      )}

      <p className="text-xs text-ink-500">
        You're charged after each completed wash. Skipping a wash costs nothing.
      </p>
    </div>
  );
}
