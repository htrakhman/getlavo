'use client';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export default function FlyerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [building, setBuilding] = useState<{ name: string; city: string; region: string } | null>(null);
  const [url, setUrl] = useState('');

  useEffect(() => {
    supabaseBrowser()
      .from('buildings')
      .select('name, city, region, slug')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setBuilding(data);
        const appUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        setUrl(`${appUrl}/b/${data.slug}`);
      });
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 260,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }, [url]);

  // Auto-open print dialog once QR is rendered
  useEffect(() => {
    if (!url || !building) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [url, building]);

  if (!building) return null;

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { size: letter; margin: 0; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* Print button — hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow hover:bg-gray-800"
        >
          Print flyer
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow hover:bg-gray-50"
        >
          Close
        </button>
      </div>

      {/* Flyer — letter size 8.5×11in */}
      <div style={{
        width: '8.5in',
        minHeight: '11in',
        margin: '0 auto',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        color: '#0a0a0a',
        overflow: 'hidden',
      }}>

        {/* Top accent bar */}
        <div style={{ height: '8px', background: 'linear-gradient(90deg, #2dd4bf, #14b8a6)' }} />

        {/* Header */}
        <div style={{ padding: '48px 64px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            {/* Star icon */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2 L15.8 10.2 L24 12 L15.8 13.8 L14 22 L12.2 13.8 L4 12 L12.2 10.2 Z" fill="#2dd4bf"/>
            </svg>
            <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              Get<span style={{ color: '#2dd4bf' }}>Gleam</span>
            </span>
          </div>
          <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6b7280', fontWeight: 500 }}>
            Mobile car wash · {building.city}, {building.region}
          </div>
        </div>

        {/* Hero */}
        <div style={{ padding: '40px 64px 0' }}>
          <h1 style={{ fontSize: '52px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-1.5px', color: '#0a0a0a' }}>
            Your building<br />
            now has a<br />
            <span style={{ color: '#2dd4bf' }}>car wash.</span>
          </h1>
          <p style={{ marginTop: '18px', fontSize: '17px', color: '#4b5563', lineHeight: 1.6, maxWidth: '420px' }}>
            Lavo is a mobile car wash service built for apartment residents.
            Operators come to <strong style={{ color: '#111' }}>{building.name}</strong> on scheduled wash days —
            you book, they wash, you're done.
          </p>
        </div>

        {/* Main content row */}
        <div style={{ padding: '44px 64px 0', display: 'flex', gap: '64px', alignItems: 'flex-start' }}>

          {/* Left: how it works */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2dd4bf', fontWeight: 600, marginBottom: '20px' }}>
              How it works
            </div>
            {[
              { n: '1', title: 'Scan the QR code', body: 'Use your phone camera to scan and open the sign-up page. No app download needed.' },
              { n: '2', title: 'Create your account', body: 'Takes 60 seconds. Enter your unit, register your car, and you\'re in.' },
              { n: '3', title: 'Book a wash', body: 'Pick a date from the upcoming wash day schedule. Pay securely in-app.' },
              { n: '4', title: 'We come to you', body: 'The crew washes your car right here at the building. You get a photo when it\'s done.' },
            ].map((step) => (
              <div key={step.n} style={{ display: 'flex', gap: '16px', marginBottom: '22px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: '#f0fdfb', border: '1.5px solid #2dd4bf',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, color: '#2dd4bf', flexShrink: 0,
                }}>
                  {step.n}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', marginBottom: '3px' }}>{step.title}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5 }}>{step.body}</div>
                </div>
              </div>
            ))}

            {/* Features */}
            <div style={{ marginTop: '8px', padding: '18px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '12px' }}>
                What's included
              </div>
              {[
                'Exterior hand wash at building wash day pricing',
                'Optional add-ons: wax, interior detail, tire shine',
                'Progress photo when your car is done',
                'All payments handled securely in-app',
              ].map((f) => (
                <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '13px', color: '#374151' }}>
                  <span style={{ color: '#2dd4bf', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: QR + CTA */}
          <div style={{ width: '240px', flexShrink: 0, textAlign: 'center' }}>
            <div style={{
              background: 'white', border: '2px solid #e5e7eb',
              borderRadius: '20px', padding: '24px', marginBottom: '16px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '16px' }}>
                Scan to sign up
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <canvas ref={canvasRef} style={{ borderRadius: '8px' }} />
              </div>
              <div style={{ marginTop: '14px', fontSize: '10px', color: '#9ca3af', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {url}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
              borderRadius: '14px', padding: '18px',
              color: 'white', textAlign: 'center',
            }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>🚗✨</div>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>Free to sign up</div>
              <div style={{ fontSize: '11px', opacity: 0.85, lineHeight: 1.4 }}>
                Only pay when you book a wash. Cancel any time.
              </div>
            </div>

            <div style={{ marginTop: '16px', fontSize: '11px', color: '#9ca3af', lineHeight: 1.5 }}>
              Questions? Visit<br />
              <strong style={{ color: '#2dd4bf' }}>getlavo.io</strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '32px 64px 40px', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              Brought to you by <strong style={{ color: '#374151' }}>{building.name}</strong> management
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              getlavo.io · Mobile car wash for apartment residents
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
