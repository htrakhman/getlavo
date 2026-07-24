import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { money } from '@/lib/format';
import { hasApprovedInsurance } from '@/lib/insurance';
import type { SupabaseClient } from '@supabase/supabase-js';

// pdf-lib StandardFonts are WinAnsi (Latin-1) only — normalise smart quotes /
// dashes and drop anything outside that range so drawText never throws.
function safe(str: string | null | undefined): string {
  return (str ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x00-\xff]/g, '');
}

const INK = rgb(0.063, 0.063, 0.063);
const BODY = rgb(0.18, 0.18, 0.2);
const MUTED = rgb(0.45, 0.45, 0.48);
const GLEAM = rgb(0, 0.55, 0.47);
const RULE = rgb(0.85, 0.85, 0.87);
const PANEL = rgb(0.96, 0.97, 0.98);

export interface ContractPdfData {
  effectiveDate: string;
  operator: {
    name: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    basePriceCents?: number | null;
    insuranceApproved: boolean;
    insuranceExpiresAt?: string | null;
  };
  building: {
    name?: string | null;
    address?: string | null;
    managerName?: string | null;
    managerEmail?: string | null;
  } | null;
  washDay?: string | null;
  governingLaw: string;
  packages: Array<{ name: string; description?: string | null; priceCents: number }>;
  addons: Array<{ label: string; priceCents: number }>;
  managerSignedName?: string | null;
  managerSignedAt?: string | null;
  operatorSignedName?: string | null;
  operatorSignedAt?: string | null;
  isPreview?: boolean;
}

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface Ctx {
  pdf: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
}

function ensure(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN) newPage(ctx);
}

function wrap(font: PDFFont, size: number, text: string, maxWidth: number): string[] {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function paragraph(ctx: Ctx, text: string, opts: { size?: number; font?: PDFFont; color?: any; indent?: number; gap?: number } = {}) {
  const size = opts.size ?? 10;
  const font = opts.font ?? ctx.regular;
  const color = opts.color ?? BODY;
  const indent = opts.indent ?? 0;
  const lineH = size * 1.45;
  const lines = wrap(font, size, text, CONTENT_W - indent);
  for (const line of lines) {
    ensure(ctx, lineH);
    ctx.page.drawText(line, { x: MARGIN + indent, y: ctx.y - size, size, font, color });
    ctx.y -= lineH;
  }
  ctx.y -= opts.gap ?? 4;
}

function heading(ctx: Ctx, text: string) {
  ensure(ctx, 30);
  ctx.y -= 8;
  ctx.page.drawText(safe(text), { x: MARGIN, y: ctx.y - 12, size: 12, font: ctx.bold, color: INK });
  ctx.y -= 20;
}

function bullet(ctx: Ctx, label: string, value: string) {
  const size = 10;
  const lineH = size * 1.45;
  ensure(ctx, lineH);
  const labelText = `${label}  `;
  ctx.page.drawText(safe(labelText), { x: MARGIN + 12, y: ctx.y - size, size, font: ctx.regular, color: MUTED });
  const labelW = ctx.regular.widthOfTextAtSize(safe(labelText), size);
  ctx.page.drawText(safe(value), { x: MARGIN + 12 + labelW, y: ctx.y - size, size, font: ctx.bold, color: INK });
  ctx.y -= lineH + 2;
}

function partyBox(ctx: Ctx, x: number, w: number, title: string, lines: string[]) {
  const padding = 10;
  const titleSize = 8;
  const bodySize = 10;
  const bodyH = bodySize * 1.45;
  const boxH = padding * 2 + 14 + lines.length * bodyH;
  ctx.page.drawRectangle({ x, y: ctx.y - boxH, width: w, height: boxH, color: PANEL, borderColor: RULE, borderWidth: 0.5 });
  let ty = ctx.y - padding - titleSize;
  ctx.page.drawText(safe(title.toUpperCase()), { x: x + padding, y: ty, size: titleSize, font: ctx.bold, color: MUTED });
  ty -= 14;
  for (const [i, line] of lines.entries()) {
    ctx.page.drawText(safe(line), { x: x + padding, y: ty, size: bodySize, font: i === 0 ? ctx.bold : ctx.regular, color: i === 0 ? INK : BODY });
    ty -= bodyH;
  }
  return boxH;
}

const BLANK = '__________________';

export async function renderContractPdf(data: ContractPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const ctx: Ctx = {
    pdf,
    page: pdf.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - MARGIN,
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };

  const buildingName = data.building?.name || BLANK;
  const address = data.building?.address || BLANK;

  // Header
  ctx.page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: GLEAM });
  ctx.page.drawText('LAVO', { x: MARGIN, y: ctx.y - 18, size: 20, font: ctx.bold, color: GLEAM });
  ctx.y -= 34;
  ctx.page.drawText('Car Wash Service Agreement', { x: MARGIN, y: ctx.y - 20, size: 20, font: ctx.bold, color: INK });
  ctx.y -= 30;
  ctx.page.drawText(safe(`Effective date: ${data.effectiveDate}`), { x: MARGIN, y: ctx.y - 10, size: 10, font: ctx.regular, color: MUTED });
  ctx.y -= 16;
  if (data.isPreview) {
    ctx.page.drawText('PREVIEW - not yet sent or signed', { x: MARGIN, y: ctx.y - 9, size: 9, font: ctx.italic, color: rgb(0.8, 0.5, 0) });
    ctx.y -= 14;
  }
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.75, color: RULE });
  ctx.y -= 14;

  // 1. Parties
  heading(ctx, '1. Parties');
  paragraph(ctx, 'This Service Agreement ("Agreement") is entered into between the Building Manager and the Service Provider identified below:');
  ctx.y -= 4;
  const colGap = 16;
  const colW = (CONTENT_W - colGap) / 2;
  const managerLines = [
    data.building?.managerName || BLANK,
    buildingName,
    address,
    ...(data.building?.managerEmail ? [data.building.managerEmail] : []),
  ];
  const opLines = [
    data.operator.name,
    ...(data.operator.contactEmail ? [data.operator.contactEmail] : []),
    ...(data.operator.contactPhone ? [data.operator.contactPhone] : []),
  ];
  const startY = ctx.y;
  const h1 = partyBox(ctx, MARGIN, colW, 'Building Manager', managerLines);
  ctx.y = startY;
  const h2 = partyBox(ctx, MARGIN + colW + colGap, colW, 'Service Provider', opLines);
  ctx.y = startY - Math.max(h1, h2) - 10;

  // 2. Services
  heading(ctx, '2. Services');
  paragraph(ctx, `Service Provider agrees to provide car wash services ("Services") at ${buildingName}, ${address}.`);
  bullet(ctx, 'Scheduled wash day:', data.washDay || BLANK);
  bullet(ctx, 'Frequency:', 'Weekly (or as agreed per the Lavo scheduling tool)');
  bullet(ctx, 'Service location:', 'Building parking garage / designated wash area');

  if (data.packages.length) {
    ctx.y -= 4;
    paragraph(ctx, 'Service packages:', { color: MUTED, gap: 2 });
    for (const p of data.packages) {
      const size = 10;
      const lineH = size * 1.45;
      ensure(ctx, lineH);
      const left = p.description ? `${p.name}  -  ${p.description}` : p.name;
      ctx.page.drawText(safe(left), { x: MARGIN + 12, y: ctx.y - size, size, font: ctx.regular, color: BODY });
      const priceText = money(p.priceCents);
      const pw = ctx.bold.widthOfTextAtSize(priceText, size);
      ctx.page.drawText(priceText, { x: PAGE_W - MARGIN - pw, y: ctx.y - size, size, font: ctx.bold, color: GLEAM });
      ctx.y -= lineH + 2;
    }
  }

  if (data.addons.length) {
    ctx.y -= 4;
    paragraph(ctx, 'Optional add-ons:', { color: MUTED, gap: 2 });
    for (const a of data.addons) {
      const size = 10;
      const lineH = size * 1.45;
      ensure(ctx, lineH);
      ctx.page.drawText(safe(a.label), { x: MARGIN + 12, y: ctx.y - size, size, font: ctx.regular, color: BODY });
      const priceText = money(a.priceCents);
      const pw = ctx.bold.widthOfTextAtSize(priceText, size);
      ctx.page.drawText(priceText, { x: PAGE_W - MARGIN - pw, y: ctx.y - size, size, font: ctx.bold, color: GLEAM });
      ctx.y -= lineH + 2;
    }
  }

  // 3. Fees & Payment
  heading(ctx, '3. Fees & Payment');
  paragraph(ctx, 'Residents pay Service Provider directly per wash via the Lavo platform. The building manager incurs no per-wash charge. Lavo collects a platform fee from each resident transaction.');
  if (data.operator.basePriceCents) {
    bullet(ctx, 'Standard base price per resident wash:', money(data.operator.basePriceCents));
  }

  // 4. Term
  heading(ctx, '4. Term');
  paragraph(ctx, 'This Agreement begins on the effective date and continues for an initial pilot period of 90 days, after which it renews automatically on a month-to-month basis unless either party provides 30 days’ written notice of termination.');

  // 5. Insurance
  heading(ctx, '5. Insurance');
  const insuranceLine = data.operator.insuranceApproved
    ? `Service Provider shall maintain general liability insurance of no less than $1,000,000 per occurrence throughout the term. Current policy on file${data.operator.insuranceExpiresAt ? `, expires ${data.operator.insuranceExpiresAt.slice(0, 10)}` : ''}.`
    : 'Service Provider shall maintain general liability insurance of no less than $1,000,000 per occurrence throughout the term. Proof of insurance to be provided prior to first service date.';
  paragraph(ctx, insuranceLine);

  // 6. Limitation of Liability
  heading(ctx, '6. Limitation of Liability');
  paragraph(ctx, 'Service Provider’s liability for any single incident is limited to the retail value of the service rendered. Building Manager is not liable for vehicles damaged during service. Lavo acts as platform intermediary and is not a party to the service relationship.');

  // 7. Governing Law
  heading(ctx, '7. Governing Law');
  paragraph(ctx, `This Agreement shall be governed by the laws of the State of ${data.governingLaw}, without regard to its conflict of law principles.`);

  // Signatures
  ctx.y -= 6;
  ensure(ctx, 130);
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.75, color: RULE });
  ctx.y -= 8;
  heading(ctx, 'Signatures');

  const sigY = ctx.y;
  drawSignature(ctx, MARGIN, colW, 'Building Manager', data.managerSignedName, data.managerSignedAt, `${data.building?.managerName || ''}${data.building?.name ? ' · ' + data.building.name : ''}`);
  ctx.y = sigY;
  drawSignature(ctx, MARGIN + colW + colGap, colW, 'Service Provider', data.operatorSignedName, data.operatorSignedAt, data.operator.name);
  ctx.y -= 90;

  return pdf.save();
}

function drawSignature(ctx: Ctx, x: number, w: number, role: string, signedName?: string | null, signedAt?: string | null, subtitle?: string) {
  let y = ctx.y;
  ctx.page.drawText(safe(role.toUpperCase()), { x, y: y - 8, size: 8, font: ctx.bold, color: MUTED });
  y -= 26;
  if (signedName) {
    ctx.page.drawText(safe(signedName), { x, y: y - 14, size: 15, font: ctx.italic, color: GLEAM });
    y -= 20;
    const dateStr = signedAt ? new Date(signedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    if (dateStr) {
      ctx.page.drawText(safe(`Signed ${dateStr}`), { x, y: y - 8, size: 8, font: ctx.regular, color: MUTED });
      y -= 12;
    }
  } else {
    ctx.page.drawLine({ start: { x, y: y - 16 }, end: { x: x + w, y: y - 16 }, thickness: 0.75, color: RULE });
    y -= 22;
  }
  if (subtitle) ctx.page.drawText(safe(subtitle), { x, y: y - 8, size: 8, font: ctx.regular, color: MUTED });
}

// ── Data gathering ────────────────────────────────────────────────────────

function operatorPdfShape(op: any) {
  return {
    name: op.name,
    contactEmail: op.contact_email,
    contactPhone: op.contact_phone,
    basePriceCents: op.base_price_cents,
    insuranceApproved: hasApprovedInsurance(op),
    insuranceExpiresAt: op.insurance_expires_at,
  };
}

async function loadPackagesAndAddons(admin: SupabaseClient, operatorId: string) {
  const [{ data: packages }, { data: addons }] = await Promise.all([
    admin.from('service_packages').select('name, description, price_cents').eq('operator_id', operatorId).eq('active', true).order('display_order'),
    admin.from('operator_addons').select('label, price_cents').eq('operator_id', operatorId).eq('active', true),
  ]);
  return {
    packages: (packages ?? []).map((p: any) => ({ name: p.name, description: p.description, priceCents: p.price_cents })),
    addons: (addons ?? []).map((a: any) => ({ label: a.label, priceCents: a.price_cents })),
  };
}

/** Assemble the full agreement data for a real contract row. */
export async function gatherContractPdfData(admin: SupabaseClient, contractId: string): Promise<ContractPdfData | null> {
  const { data: contract } = await admin.from('contracts').select('*').eq('id', contractId).maybeSingle();
  if (!contract) return null;

  const { data: op } = await admin.from('operators').select('*').eq('id', contract.operator_id).maybeSingle();
  if (!op) return null;

  const { data: building } = await admin
    .from('buildings')
    .select('id, name, address_line1, city, region, postal_code, wash_day, preferred_wash_day, profiles!manager_id(full_name, email)')
    .eq('id', contract.building_id)
    .maybeSingle();

  const manager = (building?.profiles as any) ?? null;
  const address = building
    ? `${building.address_line1}, ${building.city}, ${building.region} ${building.postal_code ?? ''}`.trim()
    : null;
  const washDay = building?.wash_day || building?.preferred_wash_day || contract.service_day || null;
  const { packages, addons } = await loadPackagesAndAddons(admin, op.id);

  return {
    effectiveDate: contract.manager_signed_at
      ? new Date(contract.manager_signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    operator: operatorPdfShape(op),
    building: {
      name: building?.name,
      address,
      managerName: manager?.full_name || manager?.email,
      managerEmail: manager?.email,
    },
    washDay,
    governingLaw: building?.region || contract.governing_law || 'Delaware',
    packages,
    addons,
    managerSignedName: contract.manager_signed_name,
    managerSignedAt: contract.manager_signed_at,
    operatorSignedName: contract.operator_signed_name,
    operatorSignedAt: contract.operator_signed_at,
  };
}

/** Assemble a preview from the operator's own profile, before any building is chosen. */
export async function gatherOperatorPreviewData(admin: SupabaseClient, operatorId: string, building?: ContractPdfData['building'], washDay?: string | null): Promise<ContractPdfData | null> {
  const { data: op } = await admin.from('operators').select('*').eq('id', operatorId).maybeSingle();
  if (!op) return null;
  const { packages, addons } = await loadPackagesAndAddons(admin, op.id);
  return {
    effectiveDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    operator: operatorPdfShape(op),
    building: building ?? null,
    washDay: washDay ?? null,
    governingLaw: 'Delaware',
    packages,
    addons,
    isPreview: true,
  };
}
