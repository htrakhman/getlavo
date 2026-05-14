import { Logo } from '@/components/Logo';

export default function LegalTermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <div className="mt-10 prose prose-invert">
        <h1 className="font-display text-3xl">Terms of Service</h1>
        <p className="text-sm text-ink-400">Last updated: 2026-05-13</p>
        <p className="mt-4 text-sm text-ink-200">
          Lavo connects apartment residents with mobile car-wash operators servicing their building. By signing up you agree to the following.
        </p>
        <h2 className="mt-6 font-display text-xl">Service</h2>
        <p className="text-sm text-ink-300">
          Lavo is a marketplace platform. Operators perform washes. We screen operators and require active insurance.
        </p>
        <h2 className="mt-6 font-display text-xl">Payments</h2>
        <p className="text-sm text-ink-300">
          You authorize charges to your saved payment method after completed washes. We retain a platform fee. Tips pass through to operators in full.
        </p>
        <h2 className="mt-6 font-display text-xl">Contact</h2>
        <p className="text-sm text-ink-300">hello@getlavo.io</p>
        <p className="mt-8 text-xs text-ink-500">Draft. Counsel review before launch.</p>
      </div>
    </main>
  );
}
