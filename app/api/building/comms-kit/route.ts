import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getSessionUser, supabaseAdmin } from '@/lib/supabase/server';
import { getCurrentBuildingForSession } from '@/lib/building';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// pdf-lib StandardFonts only support WinAnsi (Latin-1) — strip anything outside that range
function safe(str: string): string {
  return str.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/–|—/g, '-').replace(/[^\x00-\xff]/g, '');
}

// Brand colors in RGB 0-1 scale
const GLEAM = rgb(0, 0.898, 0.784); // #00e5c8
const INK = rgb(0.063, 0.063, 0.063); // #101010
const WHITE = rgb(1, 1, 1);
const GRAY = rgb(0.6, 0.6, 0.6);

export async function GET(req: Request) {
  try {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = supabaseAdmin();
  const { current: building } = await getCurrentBuildingForSession(session.user.id);
  if (!building) return NextResponse.json({ error: 'no building' }, { status: 404 });

  const { data: b } = await admin
    .from('buildings')
    .select('id, name, address_line1, city, region, slug, wash_day, preferred_wash_day')
    .eq('id', building.id)
    .maybeSingle();
  if (!b) return NextResponse.json({ error: 'no building' }, { status: 404 });

  // Also fetch the partner operator for wash day info (admin: RLS-independent read)
  const { data: partnership } = await admin
    .from('partnerships')
    .select('operator:operators(name, base_price_cents)')
    .eq('building_id', building.id)
    .in('status', ['active', 'pilot'])
    .limit(1)
    .maybeSingle();
  const op = (partnership?.operator as any) ?? null;

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') ?? 'poster';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getlavo.io';
  const washDay = b.wash_day || b.preferred_wash_day || null;

  const pdf = await PDFDocument.create();
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);

  if (kind === 'poster') {
    // 8.5x11 lobby poster
    const page = pdf.addPage([612, 792]);
    const { width, height } = page.getSize();

    // Dark background
    page.drawRectangle({ x: 0, y: 0, width, height, color: INK });

    // Gleam accent strip at top
    page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: GLEAM });

    // LAVO wordmark
    page.drawText('LAVO', {
      x: 48, y: height - 80,
      size: 42, font: helveticaBold, color: GLEAM,
    });

    // Tagline
    page.drawText('Car washes, delivered to your building.', {
      x: 48, y: height - 108,
      size: 14, font: helvetica, color: WHITE,
    });

    // Divider
    page.drawLine({ start: { x: 48, y: height - 128 }, end: { x: width - 48, y: height - 128 }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });

    // Building name section
    page.drawText('Your building:', {
      x: 48, y: height - 168,
      size: 11, font: helvetica, color: GRAY,
    });
    page.drawText(safe(b.name), {
      x: 48, y: height - 192,
      size: 28, font: helveticaBold, color: WHITE,
    });
    if (b.address_line1) {
      page.drawText(safe(`${b.address_line1}, ${b.city}, ${b.region}`), {
        x: 48, y: height - 218,
        size: 11, font: helvetica, color: GRAY,
      });
    }

    // How it works section
    const steps = [
      '1  Download the Lavo app or visit getlavo.io',
      '2  Sign up with your building invite code',
      '3  Book a wash for your car - no waiting, no hassle',
    ];
    page.drawText('How it works', {
      x: 48, y: height - 280,
      size: 13, font: helveticaBold, color: GLEAM,
    });
    steps.forEach((step, i) => {
      page.drawText(step, {
        x: 48, y: height - 304 - (i * 28),
        size: 12, font: helvetica, color: WHITE, maxWidth: width - 96,
      });
    });

    // Wash day callout box
    if (washDay || op) {
      const boxY = height - 430;
      page.drawRectangle({ x: 40, y: boxY - 10, width: width - 80, height: 80, color: rgb(0, 0.898, 0.784), opacity: 0.08, borderColor: GLEAM, borderWidth: 1, borderOpacity: 0.3 });
      if (washDay) {
        page.drawText('Building wash day:', { x: 56, y: boxY + 44, size: 10, font: helvetica, color: GRAY });
        page.drawText(safe(washDay), { x: 56, y: boxY + 26, size: 18, font: helveticaBold, color: WHITE });
      }
      if (op?.name) {
        const priceText = op.base_price_cents ? ` - from $${(op.base_price_cents / 100).toFixed(0)}` : '';
        page.drawText(safe(`Service by ${op.name}${priceText}`), { x: 56, y: boxY + 8, size: 10, font: helvetica, color: GRAY });
      }
    }

    // QR code placeholder text (real QR would need a lib)
    const qrBoxY = 160;
    const qrBoxX = width / 2 - 60;
    page.drawRectangle({ x: qrBoxX, y: qrBoxY, width: 120, height: 120, color: WHITE });
    page.drawText('Scan to sign up', { x: qrBoxX - 8, y: qrBoxY - 20, size: 10, font: helvetica, color: GRAY });
    page.drawText(appUrl.replace(/^https?:\/\//, ''), { x: qrBoxX - 20, y: qrBoxY - 36, size: 9, font: helvetica, color: GRAY });

    // Footer
    page.drawRectangle({ x: 0, y: 0, width, height: 52, color: rgb(0.04, 0.04, 0.04) });
    page.drawText(`${appUrl.replace(/^https?:\/\//, '')}  ·  Questions? hello@getlavo.io`, {
      x: 48, y: 18, size: 9, font: helvetica, color: GRAY,
    });

  } else {
    // Email snippet — half-page landscape (landscape 612x396)
    const page = pdf.addPage([612, 396]);
    const { width, height } = page.getSize();

    page.drawRectangle({ x: 0, y: 0, width, height, color: INK });
    page.drawRectangle({ x: 0, y: height - 6, width, height: 6, color: GLEAM });

    page.drawText('LAVO', { x: 40, y: height - 60, size: 32, font: helveticaBold, color: GLEAM });
    page.drawText('Car washes, delivered to your building.', { x: 40, y: height - 84, size: 12, font: helvetica, color: WHITE });

    page.drawText(`Hi neighbor,`, { x: 40, y: height - 124, size: 11, font: helveticaBold, color: WHITE });
    page.drawText(
      safe(`${b.name} has partnered with Lavo to bring professional car washes right to our building.`),
      { x: 40, y: height - 144, size: 10, font: helvetica, color: GRAY, maxWidth: width - 80 }
    );
    if (washDay) {
      page.drawText(safe(`Our scheduled wash day is ${washDay}. Book any time from your phone.`),
        { x: 40, y: height - 168, size: 10, font: helvetica, color: GRAY, maxWidth: width - 80 });
    }

    // CTA box
    page.drawRectangle({ x: 40, y: 60, width: 200, height: 44, color: GLEAM });
    page.drawText('Sign up at getlavo.io', { x: 68, y: 78, size: 12, font: helveticaBold, color: INK });

    page.drawText(`Questions? hello@getlavo.io`, { x: 40, y: 24, size: 8, font: helvetica, color: GRAY });
  }

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="lavo-comms-${kind}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
  } catch (err: any) {
    // Re-throw Next's static-render bailout so the route stays dynamic.
    if (err?.digest === 'DYNAMIC_SERVER_USAGE') throw err;
    console.error('comms-kit error:', err?.message ?? err);
    return NextResponse.json({ error: 'Failed to generate PDF', detail: err?.message ?? 'unknown' }, { status: 500 });
  }
}
