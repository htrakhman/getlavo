'use client';
import { useEffect, useState } from 'react';

export function PhotoThumb({ src, alt }: { src: string; alt?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="block">
        <img src={src} alt={alt ?? ''} className="h-24 w-24 cursor-zoom-in rounded-lg object-cover transition hover:opacity-80" />
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <img src={src} alt={alt ?? ''} className="max-h-full max-w-full rounded-lg" />
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            aria-label="Close"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}
    </>
  );
}
