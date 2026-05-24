import type { SupabaseClient } from '@supabase/supabase-js';
import { sendWaitlistJoinConfirmationEmail } from '@/lib/email/building-waitlist';

export type WaitlistRowRef = {
  id: string;
  notify_email: boolean | null;
  waitlist_confirmation_sent_at: string | null;
};

const WAITLIST_ROW_SELECT = 'id, notify_email, waitlist_confirmation_sent_at';

export function normalizeWaitlistEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Find the most recent waitlist row for this email + building (case-insensitive email). */
export async function findExistingWaitlistRow(
  sb: SupabaseClient,
  email: string,
  buildingCandidateKey: string,
  buildingId: string | null,
): Promise<WaitlistRowRef | null> {
  const normalized = normalizeWaitlistEmail(email);
  if (!normalized.includes('@')) return null;

  let q = sb.from('building_waitlist').select(WAITLIST_ROW_SELECT).ilike('email', normalized);

  if (buildingId) {
    q = q.eq('building_id', buildingId);
  } else {
    q = q.eq('building_candidate_key', buildingCandidateKey);
  }

  const { data, error } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();

  if (error?.message?.includes('waitlist_confirmation_sent_at')) {
    let legacy = sb.from('building_waitlist').select('id, notify_email').ilike('email', normalized);
    if (buildingId) legacy = legacy.eq('building_id', buildingId);
    else legacy = legacy.eq('building_candidate_key', buildingCandidateKey);
    const { data: legacyRow } = await legacy.order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!legacyRow) return null;
    return { ...legacyRow, waitlist_confirmation_sent_at: null };
  }

  return (data as WaitlistRowRef | null) ?? null;
}

async function markConfirmationSent(sb: SupabaseClient, waitlistId: string) {
  const { error } = await sb
    .from('building_waitlist')
    .update({ waitlist_confirmation_sent_at: new Date().toISOString() })
    .eq('id', waitlistId);
  if (error?.message?.includes('waitlist_confirmation_sent_at')) {
    console.warn('waitlist_confirmation_sent_at column missing; apply migration 0026');
  }
}

export async function sendWaitlistJoinConfirmation(args: {
  sb: SupabaseClient;
  email: string;
  buildingId: string | null;
  buildingLabel: string;
  formattedAddress?: string | null;
  firstName?: string | null;
}): Promise<boolean> {
  if (!args.email.includes('@')) return false;

  const onPlatform = !!args.buildingId;
  let buildingLabel = args.buildingLabel;

  if (onPlatform && (!buildingLabel || buildingLabel === 'Unknown building')) {
    const { data } = await args.sb.from('buildings').select('name').eq('id', args.buildingId).maybeSingle();
    if (data?.name) buildingLabel = data.name;
  }

  return sendWaitlistJoinConfirmationEmail({
    to: normalizeWaitlistEmail(args.email),
    firstName: args.firstName,
    buildingLabel,
    formattedAddress: args.formattedAddress,
    onPlatform,
  });
}

/**
 * Send signup confirmation if this resident has not received it yet.
 * Handles re-signups (e.g. joined before confirmation emails existed).
 */
export async function ensureWaitlistConfirmationEmail(args: {
  sb: SupabaseClient;
  email: string;
  buildingCandidateKey: string;
  buildingId: string | null;
  buildingLabel: string;
  formattedAddress?: string | null;
  firstName?: string | null;
  notifyEmail?: boolean;
  waitlistRowId?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  if (args.notifyEmail === false || !args.email.includes('@')) {
    return { sent: false, reason: 'notify_disabled' };
  }

  const existing =
    (args.waitlistRowId
      ? await args.sb
          .from('building_waitlist')
          .select(WAITLIST_ROW_SELECT)
          .eq('id', args.waitlistRowId)
          .maybeSingle()
          .then((r) => (r.data as WaitlistRowRef | null))
      : null) ??
    (await findExistingWaitlistRow(args.sb, args.email, args.buildingCandidateKey, args.buildingId));

  if (existing?.waitlist_confirmation_sent_at) {
    return { sent: false, reason: 'already_sent' };
  }
  if (existing?.notify_email === false) {
    return { sent: false, reason: 'notify_disabled' };
  }

  const sent = await sendWaitlistJoinConfirmation({
    sb: args.sb,
    email: args.email,
    buildingId: args.buildingId,
    buildingLabel: args.buildingLabel,
    formattedAddress: args.formattedAddress,
    firstName: args.firstName,
  });

  if (!sent) {
    console.error('ensureWaitlistConfirmationEmail: Resend failed', {
      email: normalizeWaitlistEmail(args.email),
      buildingId: args.buildingId,
    });
    return { sent: false, reason: 'resend_failed' };
  }

  const rowId =
    existing?.id ??
    (await findExistingWaitlistRow(args.sb, args.email, args.buildingCandidateKey, args.buildingId))?.id;

  if (rowId) await markConfirmationSent(args.sb, rowId);

  return { sent: true };
}
