import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/legal/terms',
  title: 'Terms of Service | Lavo',
  description:
    'Read the Lavo terms of service for residents, apartment buildings, and mobile car wash operators.',
});

export default function LegalTermsPage() {
  return (
    <ContentPageShell fadeHeight="h-[280px]">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Terms of Service', path: '/legal/terms' },
        ])}
      />
      <div>
        <h1 className="font-display text-3xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-ink-400">Last updated: 2026-05-13</p>
        <p className="mt-4 text-sm text-ink-200">
          Lavo connects apartment residents with mobile car-wash operators servicing their building. By signing up you agree to the following.
        </p>
        <h2 className="mt-6 font-display text-xl">Service</h2>
        <p className="mt-2 text-sm text-ink-300">
          Lavo is a marketplace platform. Operators perform washes. We screen operators and require active insurance.
        </p>
        <h2 className="mt-6 font-display text-xl">Payments</h2>
        <p className="mt-2 text-sm text-ink-300">
          You authorize charges to your saved payment method after completed washes. We retain a platform fee. Tips pass through to operators in full.
        </p>
        <h2 className="mt-6 font-display text-xl">Cancellations</h2>
        <p className="mt-2 text-sm text-ink-300">
          Residents may cancel bookings according to the timing shown at checkout. Late cancellations may be charged per operator policy.
        </p>
        <h2 className="mt-6 font-display text-xl">Contact</h2>
        <p className="text-sm text-ink-300">harold@getlavo.io</p>
      </div>
    </ContentPageShell>
  );
}
