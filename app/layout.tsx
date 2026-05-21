import './globals.css';
import type { Metadata } from 'next';
import { PostHogPageView, PostHogProvider } from '@posthog/next';
import { Suspense } from 'react';
import { ClientProviders } from '@/components/ClientProviders';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

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
        {posthogKey ? (
          <PostHogProvider
            apiKey={posthogKey}
            clientOptions={{
              api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? '/ingest',
              person_profiles: 'identified_only',
            }}
          >
            <Suspense fallback={null}>
              <PostHogPageView />
            </Suspense>
            <ClientProviders>
              <div className="relative z-10">{children}</div>
            </ClientProviders>
          </PostHogProvider>
        ) : (
          <ClientProviders>
            <div className="relative z-10">{children}</div>
          </ClientProviders>
        )}
      </body>
    </html>
  );
}
