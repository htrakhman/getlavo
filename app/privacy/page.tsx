import { Logo } from '@/components/Logo';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <div className="mt-10">
        <h1 className="font-display text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-ink-400">Last updated: 2026-05-09</p>

        <h2 className="mt-6 font-display text-xl">What we collect</h2>
        <p className="mt-2 text-sm text-ink-300">
          Account info (name, email, phone), vehicle and parking-spot info you enter, payment details (handled by Stripe;
          we never see card numbers), and wash records (date, status, photos taken by the crew).
        </p>

        <h2 className="mt-6 font-display text-xl">How we use it</h2>
        <p className="mt-2 text-sm text-ink-300">
          To run the service: route the operator to your spot, charge for completed washes, send notifications, and
          show you your history.
        </p>

        <h2 className="mt-6 font-display text-xl">Who can see what</h2>
        <p className="mt-2 text-sm text-ink-300">
          Your building manager and assigned operator can see your name, unit, vehicle, and wash history for your
          building. Other residents and other operators cannot.
        </p>

        <h2 className="mt-6 font-display text-xl">Your rights</h2>
        <p className="mt-2 text-sm text-ink-300">
          You can export or delete your data anytime from{' '}
          <a className="text-gleam" href="/account/data">Account → Data</a>, or by emailing
          hello@getlavo.io.
        </p>

        <h2 className="mt-6 font-display text-xl">SMS</h2>
        <p className="mt-2 text-sm text-ink-300">
          Reply STOP to any SMS to opt out. Reply HELP for help. Message and data rates may apply.
        </p>

        <p className="mt-8 text-xs text-ink-500">
          (Draft policy. Final text will be reviewed by counsel before launch.)
        </p>
      </div>
    </main>
  );
}
