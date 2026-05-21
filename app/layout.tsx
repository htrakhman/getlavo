import './globals.css';
import type { Metadata } from 'next';
import { ClientProviders } from '@/components/ClientProviders';
import { PostHogInit, PostHogPageView } from '@/components/PostHog';

export const metadata: Metadata = {
  title: 'Lavo — Premium car wash, delivered to your garage',
  description: 'Lavo connects apartment buildings, residents, and mobile car wash crews on one effortless platform.',
  metadataBase: new URL('https://getlavo.io'),
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grain min-h-screen bg-ink-950 text-ink-100 antialiased">
        <PostHogInit />
        <PostHogPageView />
        <ClientProviders>
          <div className="relative z-10">{children}</div>
        </ClientProviders>
      </body>
    </html>
  );
}
