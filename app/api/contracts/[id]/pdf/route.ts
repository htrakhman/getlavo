import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { gatherContractPdfData, renderContractPdf } from '@/lib/contract-pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Streams the service-agreement PDF for a contract, generated live from the
 * current operator / building / pricing data so it always reflects the latest
 * details (and any signatures collected so far). Only the building manager or
 * the operator on the contract may download it.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = supabaseAdmin();

  const { data: contract } = await admin
    .from('contracts')
    .select('id, operator_id, building_id, operator:operators(owner_id), building:buildings(manager_id)')
    .eq('id', params.id)
    .maybeSingle();
  if (!contract) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const isOperator = (contract.operator as any)?.owner_id === session.user.id;
  const isManager = (contract.building as any)?.manager_id === session.user.id;
  if (!isOperator && !isManager) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const data = await gatherContractPdfData(admin, params.id);
  if (!data) return NextResponse.json({ error: 'could not build agreement' }, { status: 500 });

  const bytes = await renderContractPdf(data);
  const filename = `lavo-service-agreement-${(data.building?.name || 'agreement').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
