import type { SupabaseClient } from '@supabase/supabase-js';
import { sendWaitlistJoinConfirmationEmail } from '@/lib/email/building-waitlist';

/** True if this email is already on the waitlist for this building (call before insert). */
export async function wasAlreadyOnBuildingWaitlist(
  sb: SupabaseClient,
  email: string,
  buildingCandidateKey: string,
  buildingId: string | null,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return false;

  if (buildingId) {
    const { count } = await sb
      .from('building_waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalized)
      .eq('building_id', buildingId);
    return (count ?? 0) > 0;
  }

  const { count } = await sb
    .from('building_waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('email', normalized)
    .eq('building_candidate_key', buildingCandidateKey);
  return (count ?? 0) > 0;
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
    to: args.email.trim(),
    firstName: args.firstName,
    buildingLabel,
    formattedAddress: args.formattedAddress,
    onPlatform,
  });
}
