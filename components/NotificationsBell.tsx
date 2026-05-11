'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Notif = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter((i) => !i.read_at).length;

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/notifications');
      const d = await r.json();
      setItems(d.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(t);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function markAll() {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    setItems((p) => p.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  async function markOne(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    setItems((p) => p.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative rounded-full p-2 text-ink-300 hover:bg-white/5 hover:text-ink-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 003.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gleam px-1 text-[10px] font-semibold text-black">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-white/10 bg-ink-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <div className="font-display text-sm">Notifications</div>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-gleam">Mark all read</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-ink-400">Loading…</div>
            )}
            {!loading && items.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-ink-400">You're all caught up.</div>
            )}
            {items.map((n) => {
              const Body = (
                <div className={`px-4 py-3 hover:bg-white/5 ${!n.read_at ? 'bg-gleam/[0.04]' : ''}`}>
                  <div className="flex items-center gap-2">
                    {!n.read_at && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gleam" />}
                    <div className="font-medium text-sm">{n.title}</div>
                  </div>
                  {n.body && <div className="mt-1 text-xs text-ink-400">{n.body}</div>}
                  <div className="mt-1 text-[10px] text-ink-500">{relTime(n.created_at)}</div>
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => markOne(n.id)} className="block border-b border-white/5">
                  {Body}
                </Link>
              ) : (
                <button key={n.id} onClick={() => markOne(n.id)} className="block w-full border-b border-white/5 text-left">
                  {Body}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
