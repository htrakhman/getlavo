'use client';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('GlobalError:', error);
    fetch('/api/error-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'client_error_boundary',
        message: error.message,
        stack: error.stack,
        context: { digest: error.digest, url: typeof window !== 'undefined' ? window.location.href : null },
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <Logo />
      <div className="mt-12">
        <h1 className="font-display text-3xl">Something went wrong.</h1>
        <p className="mt-2 text-sm text-ink-400">We hit a snag loading this page. Try again, or head back home.</p>
        {error.digest && <p className="mt-2 text-[10px] text-ink-600 font-mono">ref: {error.digest}</p>}
        <div className="mt-6 flex flex-col gap-2">
          <button onClick={reset} className="btn-primary">Try again</button>
          <Link href="/" className="btn-quiet">Back home</Link>
        </div>
      </div>
    </main>
  );
}
