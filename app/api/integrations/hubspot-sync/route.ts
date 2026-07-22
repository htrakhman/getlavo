import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Inbound webhook that mirrors Supabase records into HubSpot Contacts.
 *
 * Auth: the caller must present the shared `x-webhook-secret` header. Two
 * payload shapes are supported:
 *   - `profile`            → upsert contact identity + Lavo role
 *   - `waiver_acceptance`  → stamp waiver fields on an existing contact,
 *                            resolving the email from Supabase by profile id.
 */

const WEBHOOK_SECRET = 'EsPMCuFA3L9FFO_bSaBffCBkOcuRX_lAIn3Yp6Q3E9w';

const ProfileBody = z.object({
  type: z.literal('profile'),
  record: z.object({
    email: z.string().email(),
    full_name: z.string().nullish(),
    phone: z.string().nullish(),
    role: z.string().nullish(),
  }),
});

const WaiverBody = z.object({
  type: z.literal('waiver_acceptance'),
  record: z.object({
    profile_id: z.string().min(1),
    waiver_version: z.union([z.string(), z.number()]).nullish(),
    accepted_at: z.string().nullish(),
  }),
});

const Body = z.discriminatedUnion('type', [ProfileBody, WaiverBody]);

/** Split a free-form full name into HubSpot's first/last name fields. */
function splitName(fullName: string | null | undefined): {
  firstname: string;
  lastname: string;
} {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: '', lastname: '' };
  if (parts.length === 1) return { firstname: parts[0], lastname: '' };
  return { firstname: parts[0], lastname: parts.slice(1).join(' ') };
}

/** Upsert a contact in HubSpot keyed by email. */
async function patchHubspotContact(
  email: string,
  properties: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return { ok: false, status: 500, detail: 'HUBSPOT_ACCESS_TOKEN not configured' };
  }

  const url = `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(
    email,
  )}?idProperty=email`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { ok: false, status: res.status, detail };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (parsed.data.type === 'profile') {
    const { record } = parsed.data;
    const { firstname, lastname } = splitName(record.full_name);
    const result = await patchHubspotContact(record.email, {
      email: record.email,
      firstname,
      lastname,
      phone: record.phone ?? '',
      lavo_role: record.role ?? '',
    });
    if (!result.ok) {
      console.error('hubspot-sync profile PATCH failed', result.status, result.detail);
      return NextResponse.json({ error: 'HubSpot sync failed' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  // waiver_acceptance: resolve the contact's email from Supabase first.
  const { record } = parsed.data;
  const sb = supabaseAdmin();
  const { data: profile, error } = await sb
    .from('profiles')
    .select('email')
    .eq('id', record.profile_id)
    .maybeSingle();

  if (error) {
    console.error('hubspot-sync profile lookup failed', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
  if (!profile?.email) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const result = await patchHubspotContact(profile.email, {
    waiver_signed: true,
    waiver_version: record.waiver_version ?? '',
    waiver_signed_at: record.accepted_at ?? '',
  });
  if (!result.ok) {
    console.error('hubspot-sync waiver PATCH failed', result.status, result.detail);
    return NextResponse.json({ error: 'HubSpot sync failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
