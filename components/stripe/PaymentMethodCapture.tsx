'use client';
import { useEffect, useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, Stripe as StripeJs } from '@stripe/stripe-js';

const stripePromise: Promise<StripeJs | null> = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);

export function PaymentMethodCapture({
  onSaved,
  buttonLabel = 'Save card',
}: {
  onSaved: (paymentMethodId: string) => void | Promise<void>;
  buttonLabel?: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stripe/setup-intent', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => {
        if (d.clientSecret) setClientSecret(d.clientSecret);
        else setErr(d.error ?? 'Could not initialize payment');
      })
      .catch(() => setErr('Network error'));
  }, []);

  if (err) return <div className="text-sm text-red-400">{err}</div>;
  if (!clientSecret) return <div className="text-sm text-ink-400">Loading payment form…</div>;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: { colorPrimary: '#00e5c8', colorBackground: '#0a0a0a', borderRadius: '10px' },
        },
      }}
    >
      <CardForm onSaved={onSaved} buttonLabel={buttonLabel} />
    </Elements>
  );
}

function CardForm({ onSaved, buttonLabel }: { onSaved: (id: string) => void | Promise<void>; buttonLabel: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setErr(null);

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (error) {
      setErr(error.message ?? 'Could not save card');
      setBusy(false);
      return;
    }

    const pmId = typeof setupIntent?.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent?.payment_method?.id;

    if (!pmId) {
      setErr('No payment method returned');
      setBusy(false);
      return;
    }

    // Persist on the resident
    const res = await fetch('/api/stripe/save-payment-method', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethodId: pmId }),
    });
    if (!res.ok) {
      setErr('Could not save card on file');
      setBusy(false);
      return;
    }

    await onSaved(pmId);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement />
      {err && <div className="text-sm text-red-400">{err}</div>}
      <button type="submit" disabled={!stripe || busy} className="btn-primary w-full">
        {busy ? 'Saving…' : buttonLabel}
      </button>
    </form>
  );
}
