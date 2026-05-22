import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/legal/water-policy',
  title: 'Water and Environmental Policy | Lavo',
  description:
    'How Lavo operators follow building garage rules and local requirements for water use during mobile car wash service.',
});

export default function WaterPolicyPage() {
  return (
    <ContentPageShell fadeHeight="h-[280px]">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Water Policy', path: '/legal/water-policy' },
        ])}
      />
      <h1 className="font-display text-3xl">Water and environmental compliance</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-300">
        Lavo operators follow their own service methods and any building garage rules. Property teams should confirm drainage, ventilation, and vendor requirements with management before wash days begin.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ink-300">
        Buildings with strict environmental rules should share them during onboarding so operators can plan methods and timing accordingly.
      </p>
    </ContentPageShell>
  );
}
