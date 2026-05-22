import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/contact',
  title: 'Contact Lavo | Apartment Mobile Car Wash Support',
  description:
    'Contact Lavo for resident support, property manager questions, operator partnerships, or general help.',
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <ContentPageShell fadeHeight="h-[280px]">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ])}
      />
      {children}
    </ContentPageShell>
  );
}
