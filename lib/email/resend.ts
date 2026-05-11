import { Resend } from 'resend';

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

export async function sendBookingConfirmation(args: {
  to: string;
  residentName: string;
  operatorName: string;
  buildingName: string;
  scheduledFor: string;
  timeSlot: string | null;
  grossCents: number;
  bookingId: string;
}) {
  const price = (args.grossCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  return client().emails.send({
    from: FROM,
    to: args.to,
    subject: `Your wash is booked — ${args.scheduledFor}`,
    html: `
      <p>Hi ${escapeHtml(args.residentName)},</p>
      <p>Your car wash is confirmed at <strong>${escapeHtml(args.buildingName)}</strong>.</p>
      <table style="border-collapse:collapse;width:100%;max-width:400px;margin:16px 0">
        <tr><td style="padding:8px 0;color:#666">Operator</td><td style="padding:8px 0;font-weight:600">${escapeHtml(args.operatorName)}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Date</td><td style="padding:8px 0;font-weight:600">${escapeHtml(args.scheduledFor)}</td></tr>
        ${args.timeSlot ? `<tr><td style="padding:8px 0;color:#666">Time</td><td style="padding:8px 0;font-weight:600">${escapeHtml(args.timeSlot)}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#666">Amount paid</td><td style="padding:8px 0;font-weight:600">${price}</td></tr>
      </table>
      <p><a href="${APP_URL}/resident/bookings" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">View booking</a></p>
    `,
  });
}

export async function sendBookingNotification(args: {
  to: string;
  operatorName: string;
  buildingName: string;
  residentName: string;
  vehicleDescription: string;
  scheduledFor: string;
  timeSlot: string | null;
  netCents: number;
}) {
  const net = (args.netCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  return client().emails.send({
    from: FROM,
    to: args.to,
    subject: `New booking — ${escapeHtml(args.buildingName)} on ${escapeHtml(args.scheduledFor)}`,
    html: `
      <p>Hi ${escapeHtml(args.operatorName)},</p>
      <p>A resident at <strong>${escapeHtml(args.buildingName)}</strong> has booked a wash.</p>
      <table style="border-collapse:collapse;width:100%;max-width:400px;margin:16px 0">
        <tr><td style="padding:8px 0;color:#666">Resident</td><td style="padding:8px 0;font-weight:600">${escapeHtml(args.residentName)}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Vehicle</td><td style="padding:8px 0;font-weight:600">${escapeHtml(args.vehicleDescription)}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Date</td><td style="padding:8px 0;font-weight:600">${escapeHtml(args.scheduledFor)}</td></tr>
        ${args.timeSlot ? `<tr><td style="padding:8px 0;color:#666">Time</td><td style="padding:8px 0;font-weight:600">${escapeHtml(args.timeSlot)}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#666">Your payout</td><td style="padding:8px 0;font-weight:600">${net}</td></tr>
      </table>
      <p><a href="${APP_URL}/operator/bookings" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">View bookings</a></p>
    `,
  });
}

export async function sendWashComplete(args: {
  to: string;
  residentName: string;
  operatorName: string;
  bookingId: string;
}) {
  return client().emails.send({
    from: FROM,
    to: args.to,
    subject: 'Your wash is done',
    html: `
      <p>Hi ${escapeHtml(args.residentName)},</p>
      <p><strong>${escapeHtml(args.operatorName)}</strong> has completed your wash. Take a look and leave a quick review.</p>
      <p><a href="${APP_URL}/resident/history" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">View &amp; review</a></p>
    `,
  });
}

export async function sendPartnershipRequest(args: {
  to: string;
  operatorName: string;
  buildingName: string;
  managerName: string;
  partnershipId: string;
}) {
  return client().emails.send({
    from: FROM,
    to: args.to,
    subject: `Partnership request from ${escapeHtml(args.buildingName)}`,
    html: `
      <p>Hi ${escapeHtml(args.operatorName)},</p>
      <p><strong>${escapeHtml(args.buildingName)}</strong> (managed by ${escapeHtml(args.managerName)}) has requested a partnership with your car wash on Lavo.</p>
      <p>Accepting will make you visible to residents at this building and allow them to book washes with you.</p>
      <p><a href="${APP_URL}/operator/bookings" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#00ff88;color:#000;font-weight:600;text-decoration:none">Review request</a></p>
    `,
  });
}

export async function sendPartnershipAccepted(args: {
  to: string;
  managerName: string;
  buildingName: string;
  operatorName: string;
}) {
  return client().emails.send({
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

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
