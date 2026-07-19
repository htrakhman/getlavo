'use client';
import { useEffect } from 'react';

export function BuildingAttributor({ slug }: { slug: string }) {
  useEffect(() => {
    localStorage.setItem('lavo_building_slug', slug);

    // Cookie mirror of the slug so server-side auth callbacks (email confirm,
    // Google OAuth) can attribute the completed signup to this building's QR.
    document.cookie = `lavo_qr_slug=${encodeURIComponent(slug)}; path=/; max-age=7200; samesite=lax`;

    // If the URL carries ?invite=<token>, persist it for the signup form to consume,
    // and ping the server to mark the invite "opened".
    const url = new URL(window.location.href);
    const inviteToken = url.searchParams.get('invite');
    if (inviteToken) {
      localStorage.setItem('lavo_invite_token', inviteToken);
      fetch('/api/building/invites/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken }),
      }).catch(() => {});
    }
  }, [slug]);
  return null;
}
