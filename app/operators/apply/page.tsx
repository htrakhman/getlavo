import { Suspense } from 'react';
import { MarketingNav } from '@/components/MarketingNav';
import { OperatorApplyFormLoader } from '@/components/OperatorApplyFormLoader';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/operators/apply',
  title: 'Apply to Serve Lavo Buildings | Lavo',
  description:
    'Apply to join the Lavo operator network. Partner with apartment buildings, run scheduled wash days, and grow recurring local demand.',
});

export default function OperatorApplyPage() {
  return (
    <main className="relative">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'For operators', path: '/operators' },
          { name: 'Apply', path: '/operators/apply' },
        ])}
      />
      <div className="absolute inset-x-0 top-0 h-[400px] bg-gleam-fade" />
      <MarketingNav />

      <section
        className="relative px-6 pt-16 pb-24"
      >
        <div className="mx-auto max-w-3xl text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-gleam/30 bg-gleam/5 px-4 py-1.5 text-xs font-medium text-gleam mb-6">
            Operator application
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Apply to serve <span className="gleam-text">Lavo buildings</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-ink-300">
            Grow with approved apartment communities in your service area. Submit your application and our team will
            follow up within 48 hours.
          </p>
        </div>
        <Suspense fallback={<div className="card p-8 max-w-xl mx-auto text-sm text-ink-400">Loading form…</div>}>
          <OperatorApplyFormLoader />
        </Suspense>
      </section>

    </main>
  );
}
