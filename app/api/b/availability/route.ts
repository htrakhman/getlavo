import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBuildingAvailability } from '@/lib/availability';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Public availability for a building's assigned operator, keyed by building
 * slug. Intentionally exposes no operator identity — just open time slots —
 * so the QR landing page can show a real calendar before signup.
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit(`b-availability:${ip}`, { limit: 60, windowMs: 60_000 }).ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const slug = (req.nextUrl.searchParams.get('b') ?? '').trim();
  if (!slug) return NextResponse.json({ error: 'Missing building' }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: building } = await admin
    .from('buildings')
    .select('id')
    .eq('slug', slug)
    .in('status', ['prospect', 'pilot', 'active'])
    .maybeSingle();
  if (!building) return NextResponse.json({ error: 'Building not found' }, { status: 404 });

  const days = await getBuildingAvailability(building.id);
  return NextResponse.json({ days });
}
