import { Logo } from '@/components/Logo';
import Link from 'next/link';

const FAQ = [
  {
    q: 'How does Lavo work?',
    a: "Your building partners with a local mobile car wash crew. They come to your garage on a set day each week and wash subscribed residents' cars right in their parking spots — no need to leave the building.",
  },
  {
    q: 'How much does it cost?',
    a: "Each operator sets their own per-wash price. You only pay after a wash actually happens — no monthly fees, no charge if you skip.",
  },
  {
    q: 'Can I skip a week?',
    a: 'Yes. From your dashboard, hit "Skip this wash" any time before the morning of the wash day. No charge.',
  },
  {
    q: 'What if my car isn\'t in its spot?',
    a: 'The crew flags it and moves on. You\'re not charged for missed washes.',
  },
  {
    q: 'Is the crew insured?',
    a: 'Yes — every operator on Lavo carries active general liability insurance, verified by us.',
  },
  {
    q: 'How do I stop receiving washes?',
    a: 'Just skip any upcoming wash from your dashboard. If you want to opt out entirely, go to Account → Request account deletion, or email us.',
  },
  {
    q: 'I have another question — who do I contact?',
    a: 'Email hello@getlavo.io — we typically reply within a few hours.',
  },
];

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <div className="mt-10">
        <h1 className="font-display text-4xl tracking-tight">Help &amp; FAQ</h1>
        <p className="mt-2 text-sm text-ink-300">Quick answers. For anything else, email us.</p>

        <div className="mt-8 space-y-4">
          {FAQ.map((item) => (
            <details key={item.q} className="card p-5">
              <summary className="cursor-pointer font-medium">{item.q}</summary>
              <p className="mt-2 text-sm text-ink-300">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 text-sm text-ink-400">
          <Link href="/" className="text-gleam">Back to Lavo</Link>
        </div>
      </div>
    </main>
  );
}
