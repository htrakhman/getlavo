import Link from 'next/link';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/careers',
  title: 'Careers at Lavo',
  description: 'Open roles at Lavo. Email careers@getlavo.io.',
});

export default function CareersPage() {
  return (
    <ContentPageShell fadeHeight="h-[280px]">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Careers', path: '/careers' },
        ])}
      />
      <h1 className="font-display text-3xl">Careers</h1>
      <p className="mt-4 text-sm text-ink-300">
        We hire for growth and operations roles as the platform expands. Email{' '}
        <Link href="mailto:careers@getlavo.io" className="text-gleam hover:underline">
          careers@getlavo.io
        </Link>{' '}
        with your background and the role you are interested in.
      </p>
    </ContentPageShell>
  );
}
