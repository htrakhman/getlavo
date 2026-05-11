import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const buildingId = url.searchParams.get('buildingId');
  const month = url.searchParams.get('month'); // YYYY-MM
  if (!buildingId || !month) return NextResponse.json({ error: 'missing args' }, { status: 400 });

  const sb = supabaseServer();
  const { data: building } = await sb
    .from('buildings')
    .select('id, name, manager_id')
    .eq('id', buildingId)
    .maybeSingle();
  if (!building || building.manager_id !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const start = `${month}-01`;
  const end = nextMonthStart(month);

  const { data: washes } = await sb
    .from('washes')
    .select(`
      id, status, completed_at, flag_reason,
      wash_day:wash_days(scheduled_for, operator:operators(name)),
      resident:residents(unit_number, profile:profiles(full_name)),
      vehicle:vehicles(make, model, license_plate)
    `)
    .gte('completed_at', start)
    .lt('completed_at', end);

  const filtered = (washes ?? []).filter((w: any) => (w.wash_day as any)?.scheduled_for >= start && (w.wash_day as any)?.scheduled_for < end);

  const header = ['Date', 'Resident', 'Unit', 'Vehicle', 'Plate', 'Operator', 'Status', 'Flag reason'];
  const rows = filtered.map((w: any) => [
    w.wash_day?.scheduled_for ?? '',
    w.resident?.profile?.full_name ?? '',
    w.resident?.unit_number ?? '',
    `${w.vehicle?.make ?? ''} ${w.vehicle?.model ?? ''}`.trim(),
    w.vehicle?.license_plate ?? '',
    w.wash_day?.operator?.name ?? '',
    w.status,
    w.flag_reason ?? '',
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${building.name.replace(/[^a-z0-9]/gi, '_')}-${month}.csv"`,
    },
  });
}

function csvEscape(v: any) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function nextMonthStart(month: string) {
  const [y, m] = month.split('-').map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-01`;
}
