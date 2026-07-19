import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const DOW_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAYS_AHEAD = 14;

type DayHours = { open?: string; close?: string; closed?: boolean };

function hourLabel(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

function parseHour(value: string | undefined, fallback: number): number {
  const h = parseInt((value ?? '').split(':')[0] ?? '', 10);
  return Number.isFinite(h) && h >= 0 && h <= 24 ? h : fallback;
}

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

  const { data: partnership } = await admin
    .from('partnerships')
    .select('operator:operators(id, capacity_per_day, hours_json)')
    .eq('building_id', building.id)
    .eq('status', 'active')
    .maybeSingle();

  const operator = (partnership?.operator as any) ?? null;
  if (!operator) return NextResponse.json({ days: [] });

  const start = new Date();
  start.setDate(start.getDate() + 1); // bookings open from tomorrow
  const dates: string[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  // Count active bookings per day so full days show as unavailable.
  const { data: booked } = await admin
    .from('bookings')
    .select('scheduled_for')
    .eq('operator_id', operator.id)
    .in('status', ['confirmed', 'in_progress'])
    .gte('scheduled_for', dates[0])
    .lte('scheduled_for', dates[dates.length - 1]);

  const bookedPerDay = new Map<string, number>();
  for (const b of booked ?? []) {
    bookedPerDay.set(b.scheduled_for, (bookedPerDay.get(b.scheduled_for) ?? 0) + 1);
  }

  const hours = (operator.hours_json ?? {}) as Record<string, DayHours>;
  const capacity = operator.capacity_per_day ?? 20;

  const days = dates.map((date) => {
    const dow = DOW_KEYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
    const dayHours = hours[dow];
    const closed = dayHours?.closed === true;
    const open = parseHour(dayHours?.open, 8);
    const close = parseHour(dayHours?.close, 17);
    const full = (bookedPerDay.get(date) ?? 0) >= capacity;

    const slots: string[] = [];
    if (!closed && !full) {
      for (let h = open; h < close; h++) slots.push(hourLabel(h));
    }

    return { date, dow, slots, full };
  });

  return NextResponse.json({ days });
}
