import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'no token' }, { status: 400 });
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('building_invites')
    .select('email, full_name, unit_number, building:buildings(name, slug)')
    .eq('token', token)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    email: data.email,
    fullName: data.full_name,
    unitNumber: data.unit_number,
    buildingName: (data.building as any)?.name,
    buildingSlug: (data.building as any)?.slug,
  });
}
