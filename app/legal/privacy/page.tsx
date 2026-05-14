import { Logo } from '@/components/Logo';

export default function LegalPrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <div className="mt-10">
        <h1 className="font-display text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-ink-400">Last updated: 2026-05-13</p>
        <h2 className="mt-6 font-display text-xl">What we collect</h2>
        <p className="mt-2 text-sm text-ink-300">
          Account info, vehicle and parking details, payment data via Stripe, wash records including crew photos.
        </p>
        <h2 className="mt-6 font-display text-xl">CCPA</h2>
        <p className="mt-2 text-sm text-ink-300">California residents may request access or deletion at hello@getlavo.io.</p>
        <p className="mt-8 text-xs text-ink-500">Draft. Counsel review before launch.</p>
      </div>
    </main>
  );
}
