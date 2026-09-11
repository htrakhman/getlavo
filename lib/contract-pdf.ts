import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { money } from '@/lib/format';
import { hasApprovedInsurance } from '@/lib/insurance';
import { DEFAULT_GOVERNING_LAW, resolveGoverningLaw } from '@/lib/governing-law';
import { MINIMUM_CUTOFF_HOURS } from '@/lib/wash-day-minimum';
import { normalizeBillingMode, type BillingMode } from '@/lib/billing-arrangement';
import { LIABILITY_CLAUSES, insuranceClause } from '@/lib/contract-terms';
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
  /** Operator's minimum bookings per wash day. 0 means they attend every day. */
  minBookings?: number | null;
  /** Who pays for a wash under this agreement. */
  billingMode?: BillingMode | string | null;
  /** Per-wash amount the property covers, under property_subsidized. */
  propertySubsidyCents?: number | null;
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

/**
 * A priced line item: label on the left, price right-aligned, optional
 * description wrapped underneath.
 *
 * Packages and add-ons used to call drawText directly with the name and
 * description joined into one string, which broke in two ways at once. Nothing
 * wrapped, so a long label ran under the price and off the page; and pdf-lib
 * honours newlines inside a string, so an operator whose description carried
 * line breaks got several lines drawn downward while y advanced by exactly
 * one — every package after it was overprinted by the one above. Operators
 * write real marketing copy in these fields, so both cases were the norm
 * rather than the edge.
 */
/**
 * How much of a package description belongs in the agreement.
 *
 * Operators write marketing copy here — "Best For:", "What You'll Get:", several
 * paragraphs each. Rendered in full across a menu of packages it buries the
 * actual terms in sales prose. The opening sentences are the part that reads as
 * scope ("Based on average condition. Heavy buildup may require additional time
 * or cost."), so keep those and point at the app for the rest.
 */
const DESCRIPTION_LIMIT = 200;

export function condenseDescription(text: string | null | undefined): string | null {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!flat) return null;
  if (flat.length <= DESCRIPTION_LIMIT) return flat;

  const window = flat.slice(0, DESCRIPTION_LIMIT);
  // Prefer a sentence boundary, so the cut reads as a finished thought.
  const sentenceEnd = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '));
  if (sentenceEnd > DESCRIPTION_LIMIT * 0.4) return window.slice(0, sentenceEnd + 1);

  const lastSpace = window.lastIndexOf(' ');
  return `${(lastSpace > 0 ? window.slice(0, lastSpace) : window).replace(/[,;:]$/, '')}…`;
}

function priceRow(ctx: Ctx, label: string, priceText: string, description?: string | null) {
  const size = 10;
  const lineH = size * 1.45;
  const gutter = 12;
  const priceW = ctx.bold.widthOfTextAtSize(safe(priceText), size);
  const labelW = CONTENT_W - 12 - priceW - gutter;

  const labelLines = wrap(ctx.bold, size, label, labelW);
  ensure(ctx, lineH);

  // Price sits on the first line of the label, right-aligned to the margin.
  ctx.page.drawText(safe(priceText), {
    x: PAGE_W - MARGIN - priceW,
    y: ctx.y - size,
    size,
    font: ctx.bold,
    color: GLEAM,
  });

  for (const line of labelLines) {
    ensure(ctx, lineH);
    ctx.page.drawText(line, { x: MARGIN + 12, y: ctx.y - size, size, font: ctx.bold, color: INK });
    ctx.y -= lineH;
  }

  if (description) {
    const descSize = 9;
    const descLineH = descSize * 1.4;
    for (const line of wrap(ctx.regular, descSize, description, CONTENT_W - 24)) {
      ensure(ctx, descLineH);
      ctx.page.drawText(line, { x: MARGIN + 24, y: ctx.y - descSize, size: descSize, font: ctx.regular, color: MUTED });
      ctx.y -= descLineH;
    }
  }

  ctx.y -= 4;
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
  paragraph(ctx, 'This Service Agreement ("Agreement") is entered into between the Property Manager and the Service Provider identified below:');
  paragraph(ctx, '"Property" means the building, buildings or premises identified above, whether residential or commercial. "Occupants" means the residents and tenants of the Property, and the employees, staff and authorized visitors of those tenants, who book Services under this Agreement. A tenant that is a business books through the individuals it authorizes.', { color: MUTED, gap: 2 });
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
    data.operator.name || BLANK,
    ...(data.operator.contactEmail ? [data.operator.contactEmail] : []),
    ...(data.operator.contactPhone ? [data.operator.contactPhone] : []),
  ];
  const startY = ctx.y;
  const h1 = partyBox(ctx, MARGIN, colW, 'Property Manager', managerLines);
  ctx.y = startY;
  const h2 = partyBox(ctx, MARGIN + colW + colGap, colW, 'Service Provider', opLines);
  ctx.y = startY - Math.max(h1, h2) - 10;

  // 2. Services
  heading(ctx, '2. Services');
  paragraph(ctx, `Service Provider agrees to provide car wash services ("Services") at the Property: ${buildingName}, ${address}.`);
  const minBookings = Math.max(0, data.minBookings ?? 0);
  bullet(ctx, 'Service dates:', 'Scheduled through the Lavo platform');
  paragraph(
    ctx,
    'Service Provider proposes dates and Property Manager confirms them. Either party may decline a proposed date, and a date that is not confirmed creates no obligation for either party.',
    { color: MUTED, gap: 2 },
  );
  bullet(ctx, 'Frequency:', 'No fixed cadence');
  paragraph(
    ctx,
    'This Agreement commits neither party to any particular day of the week or number of visits. Service Provider sets their own availability and may change it at any time.',
    { color: MUTED, gap: 2 },
  );
  bullet(ctx, 'Minimum bookings per wash day:', minBookings > 0 ? String(minBookings) : 'None');
  bullet(ctx, 'Service location:', 'Parking area at the Property designated by Property Manager');
  paragraph(
    ctx,
    minBookings > 0
      ? `A scheduled wash day carrying fewer than ${minBookings} booking${minBookings === 1 ? '' : 's'} ${MINIMUM_CUTOFF_HOURS} hours beforehand is cancelled automatically and every affected Occupant is refunded in full. Service Provider is under no obligation to attend a wash day that does not meet this minimum, and no penalty arises from a day cancelled this way.`
      : 'Service Provider attends every scheduled wash day regardless of how many Occupants book it.',
    { color: MUTED, gap: 2 },
  );

  if (data.packages.length) {
    ctx.y -= 4;
    paragraph(ctx, 'Service packages:', { color: MUTED, gap: 2 });
    for (const p of data.packages) {
      priceRow(ctx, p.name, money(p.priceCents), condenseDescription(p.description));
    }
    if (data.packages.some((p) => (p.description ?? '').replace(/\s+/g, ' ').trim().length > DESCRIPTION_LIMIT)) {
      paragraph(ctx, 'Package descriptions are abridged here; the full description of each package is available on the Lavo platform.', { size: 8, color: MUTED, gap: 2 });
    }
  }

  if (data.addons.length) {
    ctx.y -= 4;
    paragraph(ctx, 'Optional add-ons:', { color: MUTED, gap: 2 });
    for (const a of data.addons) {
      priceRow(ctx, a.label, money(a.priceCents));
    }
  }

  // 3. Fees & Payment
  heading(ctx, '3. Fees & Payment');
  const billingMode = normalizeBillingMode(data.billingMode);
  const subsidyCents = Math.max(0, data.propertySubsidyCents ?? 0);
  paragraph(
    ctx,
    billingMode === 'property_pays'
      ? 'Property Manager pays for each wash via the Lavo platform, charged to the payment method kept on file for the Property. Occupants book at no charge to themselves. Lavo collects a platform fee from each transaction.'
      : billingMode === 'property_subsidized'
        ? `Property Manager covers ${money(subsidyCents)} of each wash, charged to the payment method kept on file for the Property, and the Occupant pays the remainder at checkout. Lavo collects a platform fee from each transaction.`
        : 'Occupants pay Service Provider directly per wash via the Lavo platform. Property Manager incurs no per-wash charge. Lavo collects a platform fee from each Occupant transaction.',
  );
  paragraph(ctx, 'Optional add-ons an Occupant selects at checkout are always paid by that Occupant, whatever the arrangement above.', { color: MUTED, gap: 2 });
  if (data.operator.basePriceCents) {
    bullet(ctx, 'Standard base price per wash:', money(data.operator.basePriceCents));
  }

  // 4. Term
  heading(ctx, '4. Term');
  paragraph(ctx, 'This Agreement begins on the effective date and continues on a month-to-month basis until either party provides 30 days’ written notice of termination. There is no minimum term.');

  // 5. Insurance
  heading(ctx, '5. Insurance');
  paragraph(
    ctx,
    insuranceClause({
      approved: data.operator.insuranceApproved,
      expiresAt: data.operator.insuranceExpiresAt,
    }),
  );

  // 6. Limitation of Liability
  heading(ctx, '6. Limitation of Liability');
  for (const clause of LIABILITY_CLAUSES) paragraph(ctx, clause);

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
  drawSignature(ctx, MARGIN, colW, 'Property Manager', data.managerSignedName, data.managerSignedAt, `${data.building?.managerName || ''}${data.building?.name ? ' · ' + data.building.name : ''}`);
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
    minBookings: op.min_bookings_per_day ?? 0,
    billingMode: contract.billing_mode ?? null,
    propertySubsidyCents: contract.property_subsidy_cents ?? 0,
    governingLaw: resolveGoverningLaw(building?.region, contract.governing_law),
    packages,
    addons,
    managerSignedName: contract.manager_signed_name,
    managerSignedAt: contract.manager_signed_at,
    operatorSignedName: contract.operator_signed_name,
    operatorSignedAt: contract.operator_signed_at,
  };
}

/** Assemble a preview from the operator's own profile, before any building is chosen. */
export async function gatherOperatorPreviewData(admin: SupabaseClient, operatorId: string, building?: ContractPdfData['building'], buildingRegion?: string | null): Promise<ContractPdfData | null> {
  const { data: op } = await admin.from('operators').select('*').eq('id', operatorId).maybeSingle();
  if (!op) return null;
  const { packages, addons } = await loadPackagesAndAddons(admin, op.id);
  return {
    effectiveDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    operator: operatorPdfShape(op),
    building: building ?? null,
    minBookings: op.min_bookings_per_day ?? 0,
    // A preview scoped to a building shows that building's state, so the
    // operator reads the same clause the manager will be asked to sign.
    governingLaw: resolveGoverningLaw(buildingRegion),
    packages,
    addons,
    isPreview: true,
  };
}
