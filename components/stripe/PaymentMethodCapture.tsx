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

  // The button is enabled as soon as Stripe.js and the Elements group have
  // loaded (the canonical Stripe pattern). We deliberately do NOT gate on the
  // Payment Element's `onReady` event: that event does not fire reliably in all
  // browsers/embeds, and gating on it left the button stuck disabled reading
  // "Loading…" forever, blocking every resident from adding a card. If a click
  // somehow lands before the element is fully mounted, confirmSetup's
  // IntegrationError is caught below and shown to the user instead of hanging.
  const loading = !stripe || !elements;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || busy) return;
    setBusy(true);
    setErr(null);

    try {
      const { error, setupIntent } = await stripe!.confirmSetup({
        elements: elements!,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });

      if (error) {
        setErr(error.message ?? 'Could not save card');
        return;
      }

      const pmId = typeof setupIntent?.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent?.payment_method?.id;

      if (!pmId) {
        setErr('No payment method returned');
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
        return;
      }

      await onSaved(pmId);
    } catch (e) {
      // Any thrown error (Stripe integration errors, network failures, save
      // callback rejections) lands here so the user always gets feedback.
      setErr(e instanceof Error ? e.message : 'Something went wrong saving your card. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement />
      {err && <div className="text-sm text-red-400">{err}</div>}
      <button type="submit" disabled={loading || busy} className="btn-primary w-full">
        {busy ? 'Saving…' : loading ? 'Loading…' : buttonLabel}
      </button>
    </form>
  );
}
