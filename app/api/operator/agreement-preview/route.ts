import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { gatherOperatorPreviewData, renderContractPdf } from '@/lib/contract-pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Streams a preview of the operator's service agreement, generated from their
 * own profile (name, packages, pricing, insurance). Building-specific fields
 * are left blank so the operator can see the auto-filled document before
 * sending it to any building. Optionally scoped to a building via ?building=.
 */
export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('operator')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  const { data: op } = await sb.from('operators').select('id').eq('owner_id', session.user.id).maybeSingle();
  if (!op) return NextResponse.json({ error: 'operator not found' }, { status: 404 });

  const buildingId = new URL(req.url).searchParams.get('building');
  let building = null;
  let washDay: string | null = null;
  if (buildingId) {
    const { data: b } = await admin
      .from('buildings')
      .select('name, address_line1, city, region, postal_code, wash_day, preferred_wash_day, profiles!manager_id(full_name, email)')
      .eq('id', buildingId)
      .maybeSingle();
    if (b) {
      const manager = (b.profiles as any) ?? null;
      building = {
        name: b.name,
        address: `${b.address_line1}, ${b.city}, ${b.region} ${b.postal_code ?? ''}`.trim(),
        managerName: manager?.full_name || manager?.email,
        managerEmail: manager?.email,
      };
      washDay = b.wash_day || b.preferred_wash_day || null;
    }
  }

  const data = await gatherOperatorPreviewData(admin, op.id, building, washDay);
  if (!data) return NextResponse.json({ error: 'could not build preview' }, { status: 500 });

  const bytes = await renderContractPdf(data);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="lavo-service-agreement-preview.pdf"',
      'Cache-Control': 'no-store',
    },
  });
}
