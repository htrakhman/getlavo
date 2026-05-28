import Link from 'next/link';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/legal/damage-policy',
  title: 'Damage Policy | Lavo',
  description:
    'Learn how Lavo handles operator liability, vehicle movement, damage reports, documentation, and resident support.',
});

export default function DamagePolicyPage() {
  return (
    <ContentPageShell fadeHeight="h-[280px]">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Damage Policy', path: '/legal/damage-policy' },
        ])}
      />
      <h1 className="font-display text-3xl">Damage policy</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-300">
        Pre and post photos are required on every wash. Residents file claims in the app. Operators respond with their photos. Lavo support reviews reports with booking context and may involve operator insurance when applicable.
      </p>
      <h2 className="mt-6 font-display text-xl">Who is responsible</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        Each building–operator partnership includes terms where the operator accepts liability and responsibility for damage to resident vehicles while providing service at that property. That responsibility covers the full service window—not only time at the wash bay—including when the operator moves a vehicle to the approved cleaning area.
      </p>
      <h2 className="mt-6 font-display text-xl">Vehicle movement and keys</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        Many buildings coordinate key collection or concierge handoff before the crew arrives so operators can move vehicles to the designated wash area without residents waiting on site. Issues that arise during that handoff or movement are handled under the same operator responsibility and review process described here.
      </p>
      <h2 className="mt-6 font-display text-xl">How to report an issue</h2>
      <p className="mt-2 text-sm text-ink-300">
        Open the booking in your resident account or email harold@getlavo.io with the date, photos, and a short description of the concern.
      </p>
      <h2 className="mt-6 font-display text-xl">Review process</h2>
      <p className="mt-2 text-sm text-ink-300">
        Lavo collects resident and operator evidence before a decision. Timelines depend on complexity and insurer response when required.
      </p>
      <p className="mt-6 text-sm text-ink-400">
        Building programs: see{' '}
        <Link href="/safety" className="text-gleam hover:underline">
          Safety and vetting
        </Link>
        .
      </p>
    </ContentPageShell>
  );
}
