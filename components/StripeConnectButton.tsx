'use client';

export function StripeConnectButton({ label, className }: { label: string; className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => { window.location.assign('/api/stripe/connect/onboard'); }}
    >
      {label}
    </button>
  );
}
