'use client';
import { useEffect } from 'react';

export function BuildingAttributor({ slug }: { slug: string }) {
  useEffect(() => {
    localStorage.setItem('lavo_building_slug', slug);

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
