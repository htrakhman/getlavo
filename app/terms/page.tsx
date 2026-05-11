import { Logo } from '@/components/Logo';

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <div className="mt-10 prose prose-invert">
        <h1 className="font-display text-3xl">Terms of Service</h1>
        <p className="text-sm text-ink-400">Last updated: 2026-05-09</p>

        <p className="mt-4 text-sm text-ink-200">
          Lavo connects apartment residents with mobile car-wash operators servicing their building.
          By signing up you agree to the following.
        </p>

        <h2 className="mt-6 font-display text-xl">Service</h2>
        <p className="text-sm text-ink-300">
          Lavo is a marketplace platform. We do not perform car washes ourselves; the operator assigned to your
          building does. Quality, scheduling, and service execution are the operator's responsibility, but we screen
          operators and require active insurance.
        </p>

        <h2 className="mt-6 font-display text-xl">Payments</h2>
        <p className="text-sm text-ink-300">
          You authorize us to charge your saved payment method after each completed wash. Skipped or flagged washes
          are not charged. We retain a platform fee from each charge; the rest is paid to the operator.
        </p>

        <h2 className="mt-6 font-display text-xl">Opting out</h2>
        <p className="text-sm text-ink-300">
          You may skip any upcoming wash from your dashboard at any time before wash day. No refund for completed washes.
        </p>

        <h2 className="mt-6 font-display text-xl">Liability</h2>
        <p className="text-sm text-ink-300">
          Operators carry general liability insurance. For damage claims, contact the operator first; if unresolved,
          email hello@getlavo.io and we'll mediate.
        </p>

        <h2 className="mt-6 font-display text-xl">Contact</h2>
        <p className="text-sm text-ink-300">hello@getlavo.io</p>

        <p className="mt-8 text-xs text-ink-500">
          (This is a draft. Final legal text will be reviewed by counsel before launch.)
        </p>
      </div>
    </main>
  );
}
