import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/legal/privacy',
  title: 'Privacy Policy | Lavo',
  description:
    'Read how Lavo collects, uses, and protects personal information across the Lavo platform.',
});

export default function LegalPrivacyPage() {
  return (
    <ContentPageShell fadeHeight="h-[280px]">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Privacy Policy', path: '/legal/privacy' },
        ])}
      />
      <div>
        <h1 className="font-display text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-ink-400">Last updated: 2026-05-13</p>
        <h2 className="mt-6 font-display text-xl">What we collect</h2>
        <p className="mt-2 text-sm text-ink-300">
          Account info, vehicle and parking details, payment data via Stripe, wash records including crew photos.
        </p>
        <h2 className="mt-6 font-display text-xl">How we use data</h2>
        <p className="mt-2 text-sm text-ink-300">
          We use data to run bookings, payments, operator payouts, building programs, and support. We do not sell personal information.
        </p>
        <h2 className="mt-6 font-display text-xl">CCPA</h2>
        <p className="mt-2 text-sm text-ink-300">California residents may request access or deletion at hello@getlavo.io.</p>
      </div>
    </ContentPageShell>
  );
}
