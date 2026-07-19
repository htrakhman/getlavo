import Link from 'next/link';
import { Suspense } from 'react';
import { CheckBuildingFlow } from '@/components/CheckBuildingFlow';

export function ResidentFinalCta() {
  return (
    <section id="check-building" className="mx-auto max-w-xl scroll-mt-24 px-6 py-20">
      <h2 className="font-display text-center text-3xl font-semibold tracking-tight md:text-4xl">
        Check your building&apos;s availability
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-center text-ink-300">
        Search your address to see if Lavo is live — or request it for your building.
      </p>
      <div className="mt-10">
        <Suspense
          fallback={
            <div className="text-center text-sm text-ink-500">Loading address search…</div>
          }
        >
          <CheckBuildingFlow />
        </Suspense>
      </div>
      <p className="mt-8 text-center text-sm text-ink-500">
        Already on Lavo?{' '}
        <Link href="/login" className="text-ink-300 underline-offset-2 hover:text-ink-100 hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
