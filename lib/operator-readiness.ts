import { hasApprovedInsurance } from '@/lib/insurance';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Days the crew is open for business, from the hours_json blob. */
export function openWashDays(hours: any): string[] {
  if (!hours || typeof hours !== 'object') return [];
  return DAY_ORDER.filter((d) => hours[d] && hours[d].closed !== true);
}

export type OperatorProfileRow = {
  status?: string | null;
  name?: string | null;
  hours_json?: any;
  base_price_cents?: number | null;
  stripe_onboarding_complete?: boolean | null;
  insurance_doc_url?: string | null;
  insurance_review_status?: string | null;
  insurance_expires_at?: string | null;
};

export type Requirement = { key: string; label: string; done: boolean };

/**
 * Everything an operator owes before a building can act on them. One source of
 * truth: the marketplace gate, the operator's own setup checklist, and the
 * agreement-send gate all read from here, so an operator is never told they're
 * ready on one page and blocked on another.
 *
 * `activePackages` is passed in rather than queried so callers can batch the
 * count for a whole marketplace page in a single query.
 */
export function operatorRequirements(
  op: OperatorProfileRow | null | undefined,
  activePackages: number,
): Requirement[] {
  return [
    { key: 'name', label: 'business name', done: !!op?.name },
    { key: 'schedule', label: 'wash days & hours', done: openWashDays(op?.hours_json).length > 0 },
    { key: 'price', label: 'base price per wash', done: (op?.base_price_cents ?? 0) > 0 },
    { key: 'packages', label: 'a service package', done: activePackages > 0 },
    { key: 'stripe', label: 'payment account', done: !!op?.stripe_onboarding_complete },
    { key: 'insurance', label: 'insurance certificate', done: !!op?.insurance_doc_url },
  ];
}

/** Statuses that represent a deliberate admin decision to take an operator offline. */
const BLOCKED_STATUSES = ['suspended', 'rejected'];

/**
 * An operator is listed in the building marketplace as soon as they sign up —
 * an empty account is visible, not hidden. What gates a partnership request is
 * whether they've actually filled everything out, and nothing else: there is no
 * manual approval step. A database trigger flips status to 'approved' the
 * moment the checklist is complete (migration 0046), and readiness is
 * recomputed from the profile on every read, so status can never be the reason
 * a complete operator is held back.
 *
 * Insurance *review* stays non-blocking: uploading the certificate is the
 * operator's job and is required, approving it is ours and shouldn't hold a
 * building up. The service agreement still requires proof of insurance before
 * the first service date.
 */
export type OperatorSetup = {
  /** True when a building may send this operator a partnership request. */
  requestable: boolean;
  /** Outstanding items, lowercase, for manager-facing copy. */
  pending: string[];
  /** Certificate of insurance is approved and unexpired. */
  insured: boolean;
  /** Taken offline by an admin (suspended/rejected) — not an unfinished profile. */
  blocked: boolean;
};

export function operatorSetup(
  op: OperatorProfileRow | null | undefined,
  activePackages = 0,
): OperatorSetup {
  const blocked = BLOCKED_STATUSES.includes(op?.status ?? '');
  const gaps = operatorRequirements(op, activePackages).filter((r) => !r.done);

  return {
    requestable: !blocked && gaps.length === 0,
    pending: gaps.map((r) => r.label),
    insured: hasApprovedInsurance(op),
    blocked,
  };
}

/** "payment account and insurance certificate" — for inline manager-facing copy. */
export function pendingLabel(pending: string[]): string {
  if (pending.length <= 1) return pending[0] ?? '';
  return `${pending.slice(0, -1).join(', ')} and ${pending[pending.length - 1]}`;
}

/** Short chip label for a marketplace card. */
export function setupChipLabel(_setup: OperatorSetup): string {
  return 'Setting up';
}
