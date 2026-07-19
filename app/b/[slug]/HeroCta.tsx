'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Hero CTA plus a sticky bottom bar that slides in once the hero button
 * scrolls out of view (the page is a QR scan target, so the CTA should
 * never be more than a thumb-reach away).
 */
export function HeroCta({ href, label, buildingName }: { href: string; label: string; buildingName: string }) {
  const heroRef = useRef<HTMLAnchorElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <a ref={heroRef} href={href} className="btn-primary w-full py-3.5 text-base">
        {label}
      </a>
      <div
        aria-hidden={!stuck}
        className={`fixed inset-x-0 bottom-0 z-50 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-all duration-300 ${
          stuck ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
        }`}
      >
        <div className="card mx-auto max-w-md p-3">
          <div className="mb-2 truncate px-1 text-center text-xs text-ink-400">{buildingName}</div>
          <a href={href} className="btn-primary w-full py-3" tabIndex={stuck ? 0 : -1}>
            {label}
          </a>
        </div>
      </div>
    </>
  );
}
