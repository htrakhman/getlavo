import Link from 'next/link';
import { Suspense } from 'react';
import { CheckBuildingFlow } from '@/components/CheckBuildingFlow';

export function ResidentFinalCta() {
  return (
    <section id="check-building" className="mx-auto max-w-xl scroll-mt-24 px-6 py-16">
      <h2 className="font-display text-center text-3xl font-semibold tracking-tight md:text-4xl">
        See if Lavo is available at your building
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-center text-ink-300">
        Enter your building to check availability or request Lavo where you live.
      </p>
      <div className="mt-10">
        <Suspense fallback={<div className="text-center text-sm text-ink-500">Loading address search…</div>}>
          <CheckBuildingFlow />
        </Suspense>
      </div>
      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <Link href="/buildings" className="text-sm font-medium text-gleam hover:underline">
          I manage a property
        </Link>
        <Link href="/operators" className="text-sm text-ink-400 hover:text-ink-200 hover:underline">
          I run a mobile car wash
        </Link>
      </div>
    </section>
  );
}
