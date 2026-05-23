'use client';

import type { CityFaq } from '@/lib/seo/cities/types';

type CityFaqAccordionProps = {
  title: string;
  items: CityFaq[];
  citySlug: string;
  countySlug: string;
};

export function CityFaqAccordion({ title, items, citySlug, countySlug }: CityFaqAccordionProps) {
  return (
    <section className="mb-10" data-page-type="city" data-city={citySlug} data-county={countySlug}>
      <h2 className="font-display text-2xl text-ink-100">{title}</h2>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="card group p-0"
            data-cta-type="city_page_faq_open"
            data-city={citySlug}
            data-county={countySlug}
          >
            <summary className="cursor-pointer list-none px-5 py-4 font-medium text-ink-100 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-4">
                {item.question}
                <span
                  className="shrink-0 text-gleam transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </span>
            </summary>
            <div className="border-t border-white/10 px-5 pb-4 pt-2 text-sm leading-relaxed text-ink-300">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
