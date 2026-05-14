'use client';

import { useState } from 'react';
import { Logo } from '@/components/Logo';

export default function ContactPage() {
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg('Thanks. We read every message at hello@getlavo.io');
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Logo />
      <h1 className="mt-10 font-display text-3xl">Contact</h1>
      <p className="mt-2 text-sm text-ink-400">hello@getlavo.io · Lavo, Inc.</p>
      <form className="mt-6 space-y-3" onSubmit={submit}>
        <input className="field" required name="email" type="email" placeholder="Your email" />
        <textarea className="field min-h-[120px]" required name="message" placeholder="How can we help?" />
        <button className="btn-primary w-full" type="submit">
          Send
        </button>
      </form>
      {msg && <p className="mt-4 text-sm text-gleam">{msg}</p>}
    </main>
  );
}
