'use client';

import { useCallback, useState, type KeyboardEvent } from 'react';

const TABS = [
  {
    id: 'properties',
    label: 'Properties',
    summary:
      'Offer a free resident amenity without handling bookings, payments, or operator coordination.',
    bullets: [
      'Free to launch',
      'Share QR code or resident link',
      'Connect with local operators',
      'Keep the building process organized',
    ],
  },
  {
    id: 'residents',
    label: 'Residents',
    summary: 'Book a wash from your phone without leaving the building.',
    bullets: [
      'Add vehicle and parking spot',
      'Pick a wash day or open slot',
      'Pay in the app',
      'Get notified when complete',
    ],
  },
  {
    id: 'operators',
    label: 'Operators',
    summary: 'Run organized building wash days from one job board.',
    bullets: [
      'Accept building partnerships',
      'View bookings and vehicle details',
      'Follow access instructions',
      'Complete jobs with photos and get paid',
    ],
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function RoleTabs() {
  const [active, setActive] = useState<TabId>('properties');
  const panel = TABS.find((t) => t.id === active)!;

  const onKeyDown = useCallback((e: KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      next = (index + 1) % TABS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      next = (index - 1 + TABS.length) % TABS.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      next = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      next = TABS.length - 1;
    } else {
      return;
    }
    setActive(TABS[next].id);
    document.getElementById(`tab-${TABS[next].id}`)?.focus();
  }, []);

  return (
    <section id="roles" className="mx-auto max-w-4xl scroll-mt-24 px-6 py-20">
      <h2 className="font-display text-center text-3xl font-semibold tracking-tight md:text-4xl">
        Built for every side of the wash day
      </h2>

      <div
        role="tablist"
        aria-label="Who uses Lavo"
        className="mx-auto mt-10 flex max-w-lg flex-col gap-2 rounded-2xl border border-white/10 bg-ink-900/60 p-1.5 sm:flex-row"
      >
        {TABS.map((tab, index) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`min-h-[44px] flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
                selected
                  ? 'bg-white/10 text-ink-100 ring-1 ring-gleam/40'
                  : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${panel.id}`}
        aria-labelledby={`tab-${panel.id}`}
        className="card mt-6 p-8"
      >
        <p className="text-xs uppercase tracking-[0.18em] text-gleam">{panel.label}</p>
        <p className="mt-3 font-display text-xl text-ink-100">{panel.summary}</p>
        <ul className="mt-6 space-y-4 text-sm text-ink-300">
          {panel.bullets.map((text) => (
            <li key={text} className="flex gap-3.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam/70" aria-hidden />
              <span className="leading-relaxed">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
