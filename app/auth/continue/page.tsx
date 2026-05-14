'use client';

import { Logo } from '@/components/Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

const PORTAL_HOMES = ['/resident', '/building', '/operator'] as const;

function isPortalHome(path: string): path is (typeof PORTAL_HOMES)[number] {
  return (PORTAL_HOMES as readonly string[]).includes(path);
}

function ContinueInner() {
  const params = useSearchParams();
  const raw = params.get('next') ?? '/resident';
  const dest = isPortalHome(raw) ? raw : '/resident';
  const [note, setNote] = useState('Signing you in…');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 40;

    async function tryNavigate() {
      const sb = supabaseBrowser();
      const { data: { session } } = await sb.auth.getSession();
      if (cancelled) return;
      if (session) {
        window.location.replace(dest);
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        setNote('Session not ready — please sign in.');
        window.location.replace(`/login?next=${encodeURIComponent(dest)}`);
        return;
      }
      window.setTimeout(tryNavigate, 125);
    }

    void tryNavigate();
    return () => {
      cancelled = true;
    };
  }, [dest]);

  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <Logo />
      <p className="mt-10 text-sm text-ink-300">{note}</p>
    </main>
  );
}

export default function AuthContinuePage() {
  return (
    <Suspense
      fallback={
        <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
          <Logo />
        </main>
      }
    >
      <ContinueInner />
    </Suspense>
  );
}
