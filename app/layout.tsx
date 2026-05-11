import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lavo — Premium car wash, delivered to your garage',
  description: 'Lavo connects apartment buildings, residents, and mobile car wash crews on one effortless platform.',
  metadataBase: new URL('https://getlavo.io'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grain min-h-screen bg-ink-950 text-ink-100 antialiased">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
