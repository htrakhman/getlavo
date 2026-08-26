'use client';
import { useState } from 'react';

export function CopyResidentLink({
  url,
  className = 'btn-primary',
}: {
  url: string;
  /** Lets the button sit inline next to a card's other links, not just as the page action. */
  className?: string;
}) {
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
    <button onClick={copy} className={className}>
      {copied ? 'Copied!' : 'Copy resident link'}
    </button>
  );
}
