// insurance_expires_at is set independently of certificate review (the
// /api/operator/insurance endpoint stores expiresAt whenever it's passed), so
// an unexpired date alone does NOT mean the operator is insured. Anything
// shown to building managers or residents must also require an approved
// review — this is the single source of truth for that check.
export function hasApprovedInsurance(
  op:
    | {
        insurance_review_status?: string | null;
        insurance_expires_at?: string | null;
      }
    | null
    | undefined,
): boolean {
  if (!op) return false;
  if (op.insurance_review_status !== 'approved') return false;
  if (!op.insurance_expires_at) return false;
  const today = new Date().toISOString().slice(0, 10);
  return op.insurance_expires_at.slice(0, 10) >= today;
}
