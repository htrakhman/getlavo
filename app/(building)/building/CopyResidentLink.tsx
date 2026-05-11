'use client';
import { useState } from 'react';

export function CopyResidentLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button onClick={copy} className="btn-primary">
      {copied ? 'Copied!' : 'Copy resident link'}
    </button>
  );
}
