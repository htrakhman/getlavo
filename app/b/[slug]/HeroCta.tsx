'use client';
import { useEffect, useRef, useState } from 'react';

const CTA_CLASSES =
  'block w-full rounded-2xl bg-gradient-to-r from-[#D93EA0] via-[#8B35C9] to-[#2B7CE8] px-6 py-4 text-center text-base font-semibold text-white shadow-[0_8px_30px_rgba(139,53,201,0.45)] transition active:scale-[0.98]';

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
      <a ref={heroRef} href={href} className={CTA_CLASSES}>
        {label}
      </a>
      <div
        aria-hidden={!stuck}
        className={`fixed inset-x-0 bottom-0 z-50 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-all duration-300 ${
          stuck ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
        }`}
      >
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-black/85 p-3 backdrop-blur-md">
          <div className="mb-2 truncate px-1 text-center text-xs text-white/60">{buildingName}</div>
          <a href={href} className={CTA_CLASSES} tabIndex={stuck ? 0 : -1}>
            {label}
          </a>
        </div>
      </div>
    </>
  );
}
