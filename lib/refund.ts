import type { SupabaseClient } from '@supabase/supabase-js';
import { sendRefundIssued } from '@/lib/email/resend';
import { notify } from '@/lib/notify';
import { notificationCopies } from '@/lib/notification-emails';

/**
 * Tell the resident their money is coming back.
 *
 * Called from both refund paths — the resident cancelling their own wash and an
 * admin refunding one by hand — because a refund is the same event to the
 * person receiving it no matter who pressed the button. The admin path in
 * particular used to move the money in silence: the resident's only signal was
 * a credit appearing on their statement a week later with no explanation.
 *
 * Mirrors notifyCancelled: a real email plus an inbox row, and never allowed to
 * fail the refund. The money has already moved by the time this runs, so a
 * refused address is worth a log line and nothing more.
 */
export async function notifyRefunded(
  admin: SupabaseClient,
  bookingId: string,
  amountCents: number,
) {
  // A zero or unknown amount means we have no number worth quoting, and an
  // email saying we refunded $0.00 is worse than no email at all.
  if (!Number.isFinite(amountCents) || amountCents <= 0) return;

  const { data: booking } = await admin
    .from('bookings')
    .select(`
        id, scheduled_for, time_slot,
        resident:residents(profile_id, profile:profiles(email, full_name, notification_emails)),
        building:buildings(name)
      `)
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking) return;

  const resident = (booking.resident as any)?.profile;
  const buildingName = (booking.building as any)?.name ?? null;
  const amount = (amountCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  if (resident?.email) {
    await sendRefundIssued({
      to: resident.email,
      copies: notificationCopies(resident),
      recipientName: resident.full_name ?? 'there',
      amountCents,
      buildingName,
      scheduledFor: booking.scheduled_for,
      timeSlot: booking.time_slot,
    }).catch((e) =>
      console.error('[refund] resident email failed', { bookingId, message: e?.message }),
    );
  }

  // Inbox row only: the email above is the purpose-built version of this news,
  // and notify() would send a second, plainer copy of it.
  const residentProfileId = (booking.resident as any)?.profile_id;
  if (residentProfileId) {
    await notify(
      residentProfileId,
      'refund_issued',
      { amount, buildingName, link: '/resident/bookings' },
      { skipEmail: true },
    ).catch(() => {});
  }
}
