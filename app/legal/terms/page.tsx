import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';
import { CANCELLATION_CUTOFF_HOURS } from '@/lib/cancellation-policy';

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
        <p className="mt-2 text-sm text-ink-400">Last updated: 2026-08-03</p>
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
        <h2 className="mt-6 font-display text-xl">Cancellations and refunds</h2>
        <p className="mt-2 text-sm text-ink-300">
          You can cancel a booking from your resident portal at any time before the wash. Cancel
          more than {CANCELLATION_CUTOFF_HOURS} hours before your scheduled date and time and the
          full amount is refunded to your original payment method. Cancel within{' '}
          {CANCELLATION_CUTOFF_HOURS} hours and the booking is not refunded — the operator has held
          that slot and turned away other work for it. Rescheduling follows the same{' '}
          {CANCELLATION_CUTOFF_HOURS}-hour window.
        </p>
        <p className="mt-2 text-sm text-ink-300">
          Your keys must be at the front desk before your wash window. If the operator cannot reach
          your keys the wash cannot be performed and the booking is not refunded.
        </p>
        <p className="mt-2 text-sm text-ink-300">
          Refunds are returned to the original payment method and typically appear within five to
          ten business days, depending on your bank. If a wash was not performed, or was not
          performed as booked, contact us at the address below and we will make it right regardless
          of the window above.
        </p>
        <h2 className="mt-6 font-display text-xl">Contact</h2>
        <p className="text-sm text-ink-300">harold@getlavo.io</p>
      </div>
    </ContentPageShell>
  );
}
