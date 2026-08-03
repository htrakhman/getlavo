import { Resend } from 'resend';
import { logError } from '@/lib/error-log';

let cached: Resend | null = null;
function client() {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  cached = new Resend(key);
  return cached;
}

const FROM = process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type EmailPayload = Parameters<Resend['emails']['send']>[0];

/**
 * One message.
 *
 * `emails.send` resolves with `{ data, error }` instead of rejecting, so a
 * refused send used to slip past every `.catch()` wrapped around these
 * functions: no thrown error, no log line, no email, nothing to find
 * afterwards. Turn the error field back into a thrown error so those handlers
 * actually run.
 */
async function sendOne(payload: EmailPayload) {
  const { data, error } = await client().emails.send(payload);
  if (error) throw new Error(`${error.name ?? 'resend_error'}: ${error.message}`);
  return data;
}

/**
 * Send to the account's primary address, and send the extra notification
 * addresses (lib/notification-emails) their own copy.
 *
 * The copies used to ride along as `cc` on the primary's message, which made
 * them hostage to it: one message is one delivery outcome, so a primary address
 * the provider refuses — bounced, suppressed, undeliverable — silently takes
 * the copies with it, and the partner added precisely so they'd hear about the
 * wash hears nothing. Two messages fail independently.
 *
 * A failed copy is logged, not rethrown: the resident got their email, and
 * reporting that send as failed because a secondary address is bad is the worse
 * trade.
 */
export async function sendWithCopies(payload: EmailPayload, copies?: readonly string[]) {
  const jobs: Promise<unknown>[] = [sendOne(payload)];
  if (copies?.length) jobs.push(sendOne({ ...payload, to: [...copies] }));
  const [primary, copy] = await Promise.allSettled(jobs);

  if (copy?.status === 'rejected') {
    void logError({
      source: 'email.copies',
      message: reasonText(copy.reason),
      context: { subject: payload.subject, copies },
    });
  }
  if (primary.status === 'rejected') {
    void logError({
      source: 'email',
      message: reasonText(primary.reason),
      context: { subject: payload.subject },
    });
    throw primary.reason;
  }
  return primary.value;
}

function reasonText(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason);
}

export async function sendBookingConfirmation(args: {
  to: string;
  /** Extra notification addresses on the account (lib/notification-emails). */
  copies?: string[];
  residentName: string;
  operatorName: string;
  buildingName: string;
  scheduledFor: string;
  timeSlot: string | null;
  grossCents: number;
  bookingId: string;
  /** What the resident has to do before the appointment (see lib/booking-calendar). */
  nextSteps?: string[];
  /** ICS calendar invite attached so the wash lands on the resident's calendar. */
  ics?: string;
}) {
  const price = (args.grossCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  // The key hand-off is the one thing that decides whether the wash can happen
  // at all, so it goes in the body — not only in the calendar attachment's
  // description, which most mail clients collapse or hide.
  const steps = args.nextSteps?.length
    ? `
      <h3 style="margin:24px 0 8px;font-size:16px">Before your appointment</h3>
      <ol style="margin:0;padding-left:20px;color:#333;line-height:1.6">
        ${args.nextSteps.map((s) => `<li style="margin:6px 0">${escapeHtml(s)}</li>`).join('')}
      </ol>`
    : '';
  return sendWithCopies({
    from: FROM,
    to: args.to,
    subject: `Your wash is booked — ${args.scheduledFor}`,
    ...(args.ics
      ? { attachments: [{ filename: 'lavo-wash.ics', content: Buffer.from(args.ics).toString('base64') }] }
      : {}),
    html: `
      <p>Hi ${escapeHtml(args.residentName)},</p>
      <p>Your car wash is confirmed at <strong>${escapeHtml(args.buildingName)}</strong>.</p>
      <table style="border-collapse:collapse;width:100%;max-width:400px;margin:16px 0">
        <tr><td style="padding:8px 0;color:#666">Operator</td><td style="padding:8px 0;font-weight:600">${escapeHtml(args.operatorName)}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Date</td><td style="padding:8px 0;font-weight:600">${escapeHtml(args.scheduledFor)}</td></tr>
        ${args.timeSlot ? `<tr><td style="padding:8px 0;color:#666">Time</td><td style="padding:8px 0;font-weight:600">${escapeHtml(args.timeSlot)}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#666">Amount paid</td><td style="padding:8px 0;font-weight:600">${price}</td></tr>
      </table>
      ${steps}
      <p style="margin-top:24px"><a href="${APP_URL}/resident/bookings" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">View booking</a></p>
      <p style="color:#666;font-size:13px">The calendar invite attached to this email adds the wash to your calendar.</p>
    `,
  }, args.copies);
}

export async function sendBookingNotification(args: {
  to: string;
  operatorName: string;
  buildingName: string;
  residentName: string;
  vehicleDescription: string;
  /** Parking spot, so the crew can find the car without opening the app. */
  spotLabel?: string | null;
  addonLabels?: string[];
  scheduledFor: string;
  timeSlot: string | null;
  netCents: number;
  /** ICS calendar invite attached so the job lands on the operator's calendar automatically. */
  ics?: string;
}) {
  const net = (args.netCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;color:#666">${label}</td><td style="padding:8px 0;font-weight:600">${escapeHtml(value)}</td></tr>`;
  return sendWithCopies({
    from: FROM,
    to: args.to,
    subject: `New booking — ${escapeHtml(args.buildingName)} on ${escapeHtml(args.scheduledFor)}`,
    ...(args.ics
      ? { attachments: [{ filename: 'lavo-booking.ics', content: Buffer.from(args.ics).toString('base64') }] }
      : {}),
    html: `
      <p>Hi ${escapeHtml(args.operatorName)},</p>
      <p>A resident at <strong>${escapeHtml(args.buildingName)}</strong> has booked a wash.</p>
      <table style="border-collapse:collapse;width:100%;max-width:400px;margin:16px 0">
        <tr><td style="padding:8px 0;color:#666">Resident</td><td style="padding:8px 0;font-weight:600">${escapeHtml(args.residentName)}</td></tr>
        ${row('Vehicle', args.vehicleDescription)}
        ${args.spotLabel ? row('Spot', args.spotLabel) : ''}
        ${row('Keys', 'Front desk')}
        ${args.addonLabels?.length ? row('Add-ons', args.addonLabels.join(', ')) : ''}
        ${row('Date', args.scheduledFor)}
        ${args.timeSlot ? row('Time', args.timeSlot) : ''}
        <tr><td style="padding:8px 0;color:#666">Your payout</td><td style="padding:8px 0;font-weight:600">${net}</td></tr>
      </table>
      <p><a href="${APP_URL}/operator/bookings" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">View bookings</a></p>
    `,
  });
}

/**
 * A booking that moved. Goes to both sides of the wash: the resident who
 * changed it and the operator who has to show up, with the old slot spelled
 * out so nobody has to diff two emails to see what changed. The attached
 * invite carries a bumped SEQUENCE, so it updates the event already on the
 * recipient's calendar instead of adding a second one (see lib/ics.ts).
 */
export async function sendBookingRescheduled(args: {
  to: string;
  /** Extra notification addresses on the account (lib/notification-emails). */
  copies?: string[];
  recipientName: string;
  audience: 'resident' | 'operator';
  buildingName: string;
  /** The other party: the operator for the resident's email, the resident for the operator's. */
  counterpartyName?: string | null;
  vehicleDescription?: string | null;
  previousScheduledFor: string;
  previousTimeSlot: string | null;
  scheduledFor: string;
  timeSlot: string | null;
  nextSteps?: string[];
  ics?: string;
}) {
  const isResident = args.audience === 'resident';
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;color:#666">${label}</td><td style="padding:8px 0;font-weight:600">${escapeHtml(value)}</td></tr>`;
  const slot = (date: string, time: string | null) => (time ? `${date} at ${time}` : date);
  const steps = args.nextSteps?.length
    ? `
      <h3 style="margin:24px 0 8px;font-size:16px">Before your appointment</h3>
      <ol style="margin:0;padding-left:20px;color:#333;line-height:1.6">
        ${args.nextSteps.map((s) => `<li style="margin:6px 0">${escapeHtml(s)}</li>`).join('')}
      </ol>`
    : '';
  return sendWithCopies({
    from: FROM,
    to: args.to,
    subject: `Wash rescheduled — now ${args.scheduledFor}`,
    ...(args.ics
      ? { attachments: [{ filename: 'lavo-wash.ics', content: Buffer.from(args.ics).toString('base64') }] }
      : {}),
    html: `
      <p>Hi ${escapeHtml(args.recipientName)},</p>
      <p>${
        isResident
          ? `Your car wash at <strong>${escapeHtml(args.buildingName)}</strong> has been moved. It's the same booking at a new time — the price and any extras carry over.`
          : `A resident at <strong>${escapeHtml(args.buildingName)}</strong> moved their wash to a new time.`
      }</p>
      <table style="border-collapse:collapse;width:100%;max-width:400px;margin:16px 0">
        ${args.counterpartyName ? row(isResident ? 'Operator' : 'Resident', args.counterpartyName) : ''}
        ${args.vehicleDescription ? row('Vehicle', args.vehicleDescription) : ''}
        <tr><td style="padding:8px 0;color:#666">Was</td><td style="padding:8px 0;color:#666;text-decoration:line-through">${escapeHtml(slot(args.previousScheduledFor, args.previousTimeSlot))}</td></tr>
        ${row('Now', slot(args.scheduledFor, args.timeSlot))}
      </table>
      ${steps}
      <p style="margin-top:24px"><a href="${APP_URL}${
        isResident ? '/resident/bookings' : '/operator/bookings'
      }" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">View booking</a></p>
      <p style="color:#666;font-size:13px">The calendar invite attached to this email replaces the old event.</p>
    `,
  }, args.copies);
}

/**
 * A booking that was called off. Goes to both sides, same as a reschedule: the
 * resident who cancelled and the operator who would otherwise show up for a car
 * that isn't coming. The attached invite is a METHOD:CANCEL, so it takes the
 * wash off the recipient's calendar instead of leaving a dead appointment there.
 */
export async function sendBookingCancelled(args: {
  to: string;
  /** Extra notification addresses on the account (lib/notification-emails). */
  copies?: string[];
  recipientName: string;
  audience: 'resident' | 'operator';
  buildingName: string;
  /** The other party: the operator for the resident's email, the resident for the operator's. */
  counterpartyName?: string | null;
  vehicleDescription?: string | null;
  scheduledFor: string;
  timeSlot: string | null;
  /** Whether a refund was issued, so the resident isn't left wondering. */
  refunded?: boolean;
  ics?: string;
}) {
  const isResident = args.audience === 'resident';
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;color:#666">${label}</td><td style="padding:8px 0;font-weight:600">${escapeHtml(value)}</td></tr>`;
  const when = args.timeSlot ? `${args.scheduledFor} at ${args.timeSlot}` : args.scheduledFor;
  const link = isResident ? '/resident/bookings' : '/operator/bookings';
  return sendWithCopies({
    from: FROM,
    to: args.to,
    subject: `Wash cancelled — ${args.scheduledFor}`,
    ...(args.ics
      ? { attachments: [{ filename: 'lavo-wash.ics', content: Buffer.from(args.ics).toString('base64') }] }
      : {}),
    html: `
      <p>Hi ${escapeHtml(args.recipientName)},</p>
      <p>${
        isResident
          ? `Your car wash at <strong>${escapeHtml(args.buildingName)}</strong> has been cancelled. There's nothing left to do — you can leave your keys where they are.`
          : `A resident at <strong>${escapeHtml(args.buildingName)}</strong> cancelled their wash. You don't need to service this vehicle.`
      }</p>
      <table style="border-collapse:collapse;width:100%;max-width:400px;margin:16px 0">
        ${args.counterpartyName ? row(isResident ? 'Operator' : 'Resident', args.counterpartyName) : ''}
        ${args.vehicleDescription ? row('Vehicle', args.vehicleDescription) : ''}
        <tr><td style="padding:8px 0;color:#666">Was</td><td style="padding:8px 0;color:#666;text-decoration:line-through">${escapeHtml(when)}</td></tr>
        ${isResident && args.refunded ? row('Refund', 'Issued to your original payment method') : ''}
      </table>
      <p style="margin-top:24px"><a href="${APP_URL}${link}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">${
        isResident ? 'Book another wash' : 'View bookings'
      }</a></p>
      <p style="color:#666;font-size:13px">The calendar invite attached to this email removes the wash from your calendar.</p>
    `,
  }, args.copies);
}

export async function sendWashComplete(args: {
  to: string;
  /** Extra notification addresses on the account (lib/notification-emails). */
  copies?: string[];
  residentName: string;
  operatorName: string;
  bookingId: string;
}) {
  return sendWithCopies({
    from: FROM,
    to: args.to,
    subject: 'Your wash is done',
    html: `
      <p>Hi ${escapeHtml(args.residentName)},</p>
      <p><strong>${escapeHtml(args.operatorName)}</strong> has completed your wash. Take a look and leave a quick review.</p>
      <p><a href="${APP_URL}/resident/history" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">View &amp; review</a></p>
    `,
  }, args.copies);
}

/**
 * Where the accept/decline buttons live. Routed through `/login?redirect=` so a
 * signed-out operator lands back on the request after signing in instead of on
 * their portal home — `/operator/buildings` itself redirects to a bare `/login`
 * and loses the destination.
 */
const PARTNERSHIP_REVIEW_PATH = '/operator/buildings';
const partnershipReviewUrl = () =>
  `${APP_URL}/login?redirect=${encodeURIComponent(PARTNERSHIP_REVIEW_PATH)}`;

function detailRows(rows: [string, string | null | undefined][]) {
  const present = rows.filter(([, value]) => value != null && value !== '');
  if (!present.length) return '';
  return `<table style="border-collapse:collapse;width:100%;max-width:440px;margin:16px 0">${present
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#666;vertical-align:top">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 0;font-weight:600">${escapeHtml(String(value))}</td></tr>`,
    )
    .join('')}</table>`;
}

export async function sendPartnershipRequest(args: {
  to: string;
  operatorName: string;
  buildingName: string;
  managerName: string;
  partnershipId: string;
  /** Reply-to, so the operator can ask the manager questions directly. */
  managerEmail?: string | null;
  /** Building details, so the operator can judge the request from the email. */
  buildingAddress?: string | null;
  buildingUnits?: number | null;
  washDay?: string | null;
  requestedDates?: string[];
}) {
  const reviewUrl = partnershipReviewUrl();
  const details = detailRows([
    ['Building', args.buildingName],
    ['Address', args.buildingAddress],
    ['Units', args.buildingUnits ? `${args.buildingUnits}` : null],
    ['Preferred wash day', args.washDay],
    ['Requested dates', args.requestedDates?.length ? args.requestedDates.join(', ') : null],
    ['Property manager', args.managerEmail ? `${args.managerName} (${args.managerEmail})` : args.managerName],
  ]);

  return sendWithCopies({
    from: FROM,
    to: args.to,
    ...(args.managerEmail ? { replyTo: args.managerEmail } : {}),
    subject: `Partnership request from ${escapeHtml(args.buildingName)}`,
    html: `
      <p>Hi ${escapeHtml(args.operatorName)},</p>
      <p><strong>${escapeHtml(args.buildingName)}</strong> (managed by ${escapeHtml(args.managerName)}) has requested a partnership with your car wash on Lavo.</p>
      ${details}
      <p>Log in to <strong>accept or decline</strong> this request. Accepting makes you visible to residents at this building and lets them book washes with you right away.</p>
      <p><a href="${reviewUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">Log in to accept or decline</a></p>
      <p style="color:#666;font-size:12px">If the button doesn't work, paste this into your browser:<br>${escapeHtml(reviewUrl)}</p>
    `,
  });
}

export async function sendPartnershipAccepted(args: {
  to: string;
  managerName: string;
  buildingName: string;
  operatorName: string;
}) {
  return sendWithCopies({
    from: FROM,
    to: args.to,
    subject: `${escapeHtml(args.operatorName)} accepted your partnership request`,
    html: `
      <p>Hi ${escapeHtml(args.managerName)},</p>
      <p>Great news — <strong>${escapeHtml(args.operatorName)}</strong> has accepted the partnership request for <strong>${escapeHtml(args.buildingName)}</strong>.</p>
      <p>Residents can now sign up and book washes. Share your building link to get started.</p>
      <p><a href="${APP_URL}/building/share" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">Get your sharing link</a></p>
    `,
  });
}

export async function sendOperatorPartnershipInterest(args: {
  to: string;
  managerName: string;
  buildingName: string;
  operatorName: string;
  partnershipId: string;
}) {
  return sendWithCopies({
    from: FROM,
    to: args.to,
    subject: `${escapeHtml(args.operatorName)} wants to partner with ${escapeHtml(args.buildingName)}`,
    html: `
      <p>Hi ${escapeHtml(args.managerName)},</p>
      <p><strong>${escapeHtml(args.operatorName)}</strong> has requested to become the car wash operator for <strong>${escapeHtml(args.buildingName)}</strong> on Lavo.</p>
      <p>Review their profile and accept the partnership to let residents book washes, or Lavo can finalize the match for you.</p>
      <p><a href="${APP_URL}/building/marketplace" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">Review request</a></p>
    `,
  });
}

export async function sendPartnershipAcceptedByManager(args: {
  to: string;
  operatorName: string;
  buildingName: string;
  managerName: string;
}) {
  return sendWithCopies({
    from: FROM,
    to: args.to,
    subject: `${escapeHtml(args.buildingName)} accepted your partnership request`,
    html: `
      <p>Hi ${escapeHtml(args.operatorName)},</p>
      <p><strong>${escapeHtml(args.buildingName)}</strong> (managed by ${escapeHtml(args.managerName)}) has accepted your partnership request on Lavo.</p>
      <p>Residents can now book washes with you at this building.</p>
      <p><a href="${APP_URL}/operator/buildings" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">View buildings</a></p>
    `,
  });
}

export async function sendContractOffer(args: {
  to: string;
  managerName: string;
  buildingName: string;
  operatorName: string;
  /** The generated service-agreement PDF, attached so the manager can read it directly. */
  pdfBytes?: Uint8Array | null;
}) {
  const reviewUrl = `${APP_URL}/building/contract`;
  const attachments = args.pdfBytes
    ? [{
        filename: `lavo-service-agreement-${args.buildingName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`,
        content: Buffer.from(args.pdfBytes),
      }]
    : undefined;
  return sendWithCopies({
    from: FROM,
    to: args.to,
    subject: `${escapeHtml(args.operatorName)} sent you a service agreement for ${escapeHtml(args.buildingName)}`,
    attachments,
    html: `
      <p>Hi ${escapeHtml(args.managerName)},</p>
      <p><strong>${escapeHtml(args.operatorName)}</strong> would like to be the car wash operator for <strong>${escapeHtml(args.buildingName)}</strong> and has sent you a service agreement on Lavo.</p>
      <p>The full agreement is attached to this email as a PDF. On Lavo you can <strong>view</strong>, <strong>accept</strong>, or <strong>decline</strong> it — once you accept, both you and ${escapeHtml(args.operatorName)} are notified and the partnership moves forward.</p>
      <p><a href="${reviewUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">View, accept or decline →</a></p>
      <p style="color:#666;font-size:13px">Not interested? You can decline right from that page, or simply ignore this email.</p>
    `,
  });
}

export async function sendBuildingDatesScheduled(args: {
  to: string;
  operatorName: string;
  buildingName: string;
  dates: string[];
}) {
  return sendWithCopies({
    from: FROM,
    to: args.to,
    subject: `${escapeHtml(args.buildingName)} scheduled wash days`,
    html: `
      <p>Hi ${escapeHtml(args.operatorName)},</p>
      <p><strong>${escapeHtml(args.buildingName)}</strong> chose wash dates for your partnership. They've been added to your calendar as confirmed wash days:</p>
      <ul>${args.dates.map((d) => `<li><strong>${escapeHtml(d)}</strong></li>`).join('')}</ul>
      <p><a href="${APP_URL}/operator/wash-days" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">View wash days</a></p>
    `,
  });
}

const ADMIN_TO = process.env.ADMIN_EMAIL || 'harold@getlavo.io';

/** Internal ops notification to the Lavo admin inbox. */
export async function sendAdminNotification(args: {
  subject: string;
  lines: string[];
  replyTo?: string;
  /** Optional call-to-action button. A relative url is prefixed with APP_URL. */
  action?: { url: string; label: string };
  /** Files to attach, e.g. the certificate of insurance being reviewed. */
  attachments?: { filename: string; content: Buffer }[];
}) {
  const body = args.lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('');
  let button = '';
  if (args.action) {
    const href = args.action.url.startsWith('http') ? args.action.url : `${APP_URL}${args.action.url}`;
    button = `<p><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">${escapeHtml(args.action.label)}</a></p>`;
  }
  return sendWithCopies({
    from: FROM,
    to: ADMIN_TO,
    replyTo: args.replyTo,
    subject: args.subject,
    html: body + button,
    ...(args.attachments?.length ? { attachments: args.attachments } : {}),
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
