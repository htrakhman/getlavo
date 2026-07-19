import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildIcs } from '@/lib/ics';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Downloadable .ics for a chosen (building, date, time) slot — used by the
 * date-confirmation step so residents can add the wash to Apple/Outlook
 * calendars before checkout.
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit(`schedule-ics:${ip}`, { limit: 30, windowMs: 60_000 }).ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const slug = (req.nextUrl.searchParams.get('b') ?? '').trim();
  const date = req.nextUrl.searchParams.get('date') ?? '';
  const time = req.nextUrl.searchParams.get('time') ?? '';
  if (!slug || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { data: building } = await supabaseAdmin()
    .from('buildings')
    .select('name, address_line1, city, region')
    .eq('slug', slug)
    .maybeSingle();
  if (!building) return NextResponse.json({ error: 'Building not found' }, { status: 404 });

  const ics = buildIcs({
    uid: `lavo-${slug}-${date}@getlavo.io`,
    title: 'Lavo car wash',
    description: `Your car wash at ${building.name}. Drop your keys at the front desk before your appointment.`,
    location: [building.address_line1, building.city, building.region].filter(Boolean).join(', '),
    date,
    time: /^\d{1,2}:\d{2} (AM|PM)$/.test(time) ? time : null,
  });

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="lavo-wash-${date}.ics"`,
    },
  });
}
