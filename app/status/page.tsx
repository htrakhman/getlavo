import { Logo } from '@/components/Logo';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/status',
  title: 'System Status | Lavo',
  description: 'Lavo system status and service updates.',
  noindex: true,
});

export default function StatusPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <h1 className="mt-10 font-display text-3xl">System status</h1>
      <p className="mt-4 text-sm text-ink-300">
        Status updates are posted here when needed. For urgent booking or access issues, email{' '}
        <a href="mailto:hello@getlavo.io" className="text-gleam hover:underline">
          hello@getlavo.io
        </a>
        .
      </p>
    </main>
  );
}
