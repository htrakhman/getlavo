import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingFooter } from '@/components/MarketingNav';
import { ClientProviders } from '@/components/ClientProviders';
import { PostHogPageView } from '@/components/PostHogPageView';
import { PostHogProvider } from '@/components/PostHogProvider';

export const metadata: Metadata = {
  title: 'Lavo — Premium car wash, delivered to your garage',
  description: 'Lavo connects apartment buildings, residents, and mobile car wash crews on one effortless platform.',
  metadataBase: new URL('https://www.getlavo.io'),
  manifest: '/manifest.webmanifest',
};

const GA_MEASUREMENT_ID = 'G-SKYHNFC6DY';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`,
          }}
        />
      </head>
      <body className="grain min-h-screen bg-ink-950 text-ink-100 antialiased">
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <ClientProviders>
            <div className="relative z-10 flex min-h-screen flex-col">
              <div className="flex-1">{children}</div>
              <MarketingFooter />
            </div>
          </ClientProviders>
        </PostHogProvider>
      </body>
    </html>
  );
}
