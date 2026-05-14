import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import { ClientProviders } from '@/components/ClientProviders';

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
        {process.env.NEXT_PUBLIC_POSTHOG_KEY ? (
          <Script id="posthog" strategy="afterInteractive">
            {`window.posthog=window.posthog||[];posthog.init(${JSON.stringify(process.env.NEXT_PUBLIC_POSTHOG_KEY)},{api_host:'https://us.i.posthog.com',person_profiles:'identified_only'});`}
          </Script>
        ) : null}
        <ClientProviders>
          <div className="relative z-10">{children}</div>
        </ClientProviders>
      </body>
    </html>
  );
}
