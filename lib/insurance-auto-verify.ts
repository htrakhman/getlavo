import { supabaseAdmin } from '@/lib/supabase/admin';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';
import { INSURANCE_REVIEW_HOLD_MINUTES, autoVerifyDue, type InsuranceRow } from '@/lib/insurance';

/**
 * Certificate review clears itself. An upload lands in `pending_review`, sits
 * there for INSURANCE_REVIEW_HOLD_MINUTES, and is then marked verified without
 * anyone opening it — the admin queue is a rejection window, not a gate.
 *
 * The flip is written by this sweep rather than by a database timer, so it runs
 * from three places: the operator's own compliance page (so the operator who is
 * waiting sees it clear), the admin queue (so the list stays honest), and the
 * daily insurance-expiry cron (so a row nobody visits still clears and still
 * sends its notification). autoVerifyDue() decides the same thing purely from
 * the row, so reads are correct even between sweeps.
 */
export const AUTO_VERIFIED_NOTE = `Auto-verified after the ${INSURANCE_REVIEW_HOLD_MINUTES}-minute review hold.`;

type SweptOperator = { id: string; name: string | null; owner_id: string | null; insurance_expires_at: string | null };

/**
 * Promotes every certificate whose hold has elapsed and notifies its operator.
 * Pass an id to sweep a single operator. Returns the rows it promoted.
 *
 * Never throws: this runs inside page renders, and a verification sweep failing
 * must not take a page down with it.
 */
export async function sweepInsuranceAutoVerify(operatorId?: string): Promise<SweptOperator[]> {
  try {
    const sb = supabaseAdmin();
    const now = new Date();
    const cutoff = new Date(now.getTime() - INSURANCE_REVIEW_HOLD_MINUTES * 60_000).toISOString();
    const today = now.toISOString().slice(0, 10);

    let q = sb
      .from('operators')
      .update({
        insurance_review_status: 'approved',
        insurance_reviewed_at: now.toISOString(),
        // Clears any note left by an earlier rejection, so the operator isn't
        // reading a stale reason next to a verified badge.
        insurance_review_note: AUTO_VERIFIED_NOTE,
      })
      // Mirrors autoVerifyDue(): only from pending_review, only with a
      // certificate on file, only once the hold has run, never for a policy
      // that has already lapsed.
      .eq('insurance_review_status', 'pending_review')
      .not('insurance_doc_url', 'is', null)
      .lte('insurance_uploaded_at', cutoff)
      .gte('insurance_expires_at', today);
    if (operatorId) q = q.eq('id', operatorId);

    const { data, error } = await q.select('id, name, owner_id, insurance_expires_at');
    if (error) {
      console.error('insurance auto-verify sweep failed:', error.message);
      return [];
    }

    const promoted = (data ?? []) as SweptOperator[];
    for (const op of promoted) {
      if (op.owner_id) {
        await notify(op.owner_id, 'coi_approved', {
          operatorName: op.name,
          expiresAt: op.insurance_expires_at,
          link: '/operator/compliance',
          cta: 'View your certificate',
        }).catch((e) => console.error('coi_approved notify failed:', e));
      }
      await audit({
        actorId: null,
        actorRole: 'system',
        action: 'insurance.auto_verified',
        entityType: 'operator',
        entityId: op.id,
        metadata: { holdMinutes: INSURANCE_REVIEW_HOLD_MINUTES },
      });
    }
    return promoted;
  } catch (e: any) {
    console.error('insurance auto-verify sweep failed:', e?.message ?? e);
    return [];
  }
}

/**
 * Sweeps a single operator row if its hold has elapsed and hands back the row
 * as it now reads, so a page can render the verified state in the same pass
 * that persists it.
 */
export async function withAutoVerifiedInsurance<T extends InsuranceRow & { id: string }>(
  op: T | null,
): Promise<T | null> {
  if (!op || !autoVerifyDue(op)) return op;
  const promoted = await sweepInsuranceAutoVerify(op.id);
  if (!promoted.length) return op;
  return { ...op, insurance_review_status: 'approved', insurance_review_note: AUTO_VERIFIED_NOTE };
}
