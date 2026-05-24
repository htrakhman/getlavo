import type { AudienceCard } from '@/lib/seo/cities/types';

type AudienceCardsProps = {
  title: string;
  cards: AudienceCard[];
};

export function AudienceCards({ title, cards }: AudienceCardsProps) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-ink-100">{title}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="card p-5">
            <h3 className="font-display text-lg text-gleam">{card.title}</h3>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-300">
              {card.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-gleam" aria-hidden="true">
                    ·
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
