'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export function QRCodeShare({ url, buildingName }: { url: string; buildingName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 240,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }, [url]);

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadQR() {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.download = `${buildingName.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="rounded-2xl bg-white p-4 shadow-lg">
          <canvas ref={canvasRef} />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-800/50 px-4 py-3">
        <span className="flex-1 truncate text-sm text-ink-200 font-mono">{url}</span>
        <button
          onClick={copyLink}
          className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/10"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => window.open('/building/share/flyer', '_blank')}
          className="btn-primary text-sm"
        >
          Print elevator flyer →
        </button>
        <button onClick={downloadQR} className="btn-ghost text-sm">
          QR only
        </button>
      </div>
    </div>
  );
}
