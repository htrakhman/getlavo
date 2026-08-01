/**
 * How long a freshly uploaded certificate sits in the review queue before it
 * verifies itself. Long enough that the operator sees a real "under review"
 * state instead of an instant flip, short enough that nobody waits on a human
 * to open a queue. An admin can still reject inside the window — and after it,
 * rejection remains available from /admin/insurance.
 */
export const INSURANCE_REVIEW_HOLD_MINUTES = 5;

export type InsuranceRow = {
  insurance_review_status?: string | null;
  insurance_expires_at?: string | null;
  insurance_uploaded_at?: string | null;
  insurance_doc_url?: string | null;
};

/** The policy on file has an expiry date and that date has not passed. */
function policyUnexpired(op: InsuranceRow): boolean {
  if (!op.insurance_expires_at) return false;
  const today = new Date().toISOString().slice(0, 10);
  return op.insurance_expires_at.slice(0, 10) >= today;
}

/**
 * True once a pending certificate has served its hold and should read as
 * verified. Only ever promotes from `pending_review`: 'rejected' is a
 * deliberate admin decision and 'expired' is a fact about the policy, and
 * neither may be undone by the clock.
 *
 * Pure and time-based, so every reader agrees on the answer whether or not the
 * flip has been written to the row yet — sweepInsuranceAutoVerify() persists it
 * (and notifies the operator), this decides what to show in the meantime.
 */
export function autoVerifyDue(op: InsuranceRow | null | undefined, now = Date.now()): boolean {
  if (!op) return false;
  if (op.insurance_review_status !== 'pending_review') return false;
  if (!op.insurance_doc_url || !op.insurance_uploaded_at) return false;
  if (!policyUnexpired(op)) return false;
  const uploaded = Date.parse(op.insurance_uploaded_at);
  if (!Number.isFinite(uploaded)) return false;
  return now - uploaded >= INSURANCE_REVIEW_HOLD_MINUTES * 60_000;
}

// insurance_expires_at is set independently of certificate review (the
// /api/operator/insurance endpoint stores expiresAt whenever it's passed), so
// an unexpired date alone does NOT mean the operator is insured. Anything
// shown to building managers or residents must also require a cleared
// review — this is the single source of truth for that check.
export function hasApprovedInsurance(op: InsuranceRow | null | undefined): boolean {
  if (!op) return false;
  // Expiry gates everything: the hold clearing a certificate never outranks a
  // policy that has already lapsed.
  if (!policyUnexpired(op)) return false;
  return op.insurance_review_status === 'approved' || autoVerifyDue(op);
}
