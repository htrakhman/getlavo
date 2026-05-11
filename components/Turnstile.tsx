'use client';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; theme?: string }) => string;
      reset: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function Turnstile({ onToken }: { onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!sitekey) {
      // dev: emit a fake token so forms still submit when CAPTCHA isn't configured
      onToken('dev-skip');
      return;
    }
    if (!ref.current) return;

    const existing = document.querySelector('script[data-turnstile]');
    if (!existing) {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';
      s.async = true;
      s.dataset.turnstile = '1';
      document.head.appendChild(s);
    }

    const render = () => {
      if (window.turnstile && ref.current) {
        window.turnstile.render(ref.current, { sitekey, callback: onToken, theme: 'dark' });
      }
    };

    if (window.turnstile) render();
    else window.onTurnstileLoad = render;
  }, [sitekey, onToken]);

  if (!sitekey) return null;
  return <div ref={ref} />;
}
