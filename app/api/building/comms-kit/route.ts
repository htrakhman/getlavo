import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = supabaseServer();
  const { data: b } = await sb.from('buildings').select('id, name').eq('manager_id', session.user.id).limit(1).maybeSingle();
  if (!b) return NextResponse.json({ error: 'no building' }, { status: 404 });

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') ?? 'poster';

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(`Lavo resident kit · ${b.name}`, { x: 48, y: 720, size: 18, font });
  page.drawText(kind === 'poster' ? 'Lobby poster 8.5x11' : 'Resident email snippet', { x: 48, y: 680, size: 12, font });
  page.drawText('Book car washes without leaving the property. Download the Lavo app.', { x: 48, y: 640, size: 11, font, maxWidth: 500 });
  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="lavo-comms-${kind}.pdf"`,
    },
  });
}
