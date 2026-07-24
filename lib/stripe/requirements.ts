import type Stripe from 'stripe';

/**
 * Translate Stripe Connect `requirements` keys into plain-language sections a
 * non-technical operator can act on. Stripe returns machine keys like
 * `individual.verification.document` or `external_account`; operators need to
 * know "upload a government ID" and "add a bank account".
 *
 * Keys are matched most-specific-first, then by prefix, then prettified as a
 * fallback so a new Stripe requirement never renders as a blank/opaque item.
 */
const LABELS: Array<{ match: (key: string) => boolean; label: string }> = [
  { match: (k) => k === 'external_account' || k.startsWith('external_account'), label: 'Bank account for payouts' },
  { match: (k) => k.includes('verification.document'), label: 'Government-issued photo ID' },
  { match: (k) => k.includes('verification.additional_document'), label: 'Additional verification document' },
  { match: (k) => k.includes('.dob.'), label: 'Date of birth' },
  { match: (k) => k.endsWith('ssn_last_4') || k.endsWith('id_number'), label: 'Social Security number' },
  { match: (k) => k.includes('.address.') || k.endsWith('.address'), label: 'Home / business address' },
  { match: (k) => k.endsWith('first_name') || k.endsWith('last_name'), label: 'Your legal name' },
  { match: (k) => k.endsWith('.phone'), label: 'Phone number' },
  { match: (k) => k.endsWith('.email'), label: 'Email address' },
  { match: (k) => k.startsWith('tos_acceptance'), label: 'Accept Stripe’s terms of service' },
  { match: (k) => k.startsWith('business_profile'), label: 'Business details (what you do)' },
  { match: (k) => k === 'business_type', label: 'Business type (individual or company)' },
  { match: (k) => k.endsWith('tax_id') || k.endsWith('.ein'), label: 'Business tax ID (EIN)' },
  { match: (k) => k.startsWith('company'), label: 'Company details' },
  { match: (k) => k.startsWith('owners') || k.startsWith('directors') || k.startsWith('executives') || k.startsWith('representative') || k.startsWith('relationship'), label: 'Business ownership details' },
];

function prettify(key: string): string {
  const last = key.split('.').pop() ?? key;
  return last.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function friendlyRequirement(key: string): string {
  for (const entry of LABELS) {
    if (entry.match(key)) return entry.label;
  }
  return prettify(key);
}

export interface AccountStatus {
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  /** Fully onboarded and ready to receive payouts. */
  onboarded: boolean;
  /** Plain-language list of what's still missing, deduped. Empty when done. */
  missing: string[];
  /** Stripe's reason payouts are disabled, if any (e.g. 'requirements.past_due'). */
  disabledReason: string | null;
}

export function accountStatus(account: Stripe.Account): AccountStatus {
  const req = account.requirements;
  const dueKeys = [
    ...(req?.currently_due ?? []),
    ...(req?.past_due ?? []),
    ...(req?.eventually_due ?? []),
  ];

  const missing = Array.from(new Set(dueKeys.map(friendlyRequirement)));

  const detailsSubmitted = !!account.details_submitted;
  const chargesEnabled = !!account.charges_enabled;
  const payoutsEnabled = !!account.payouts_enabled;

  return {
    detailsSubmitted,
    chargesEnabled,
    payoutsEnabled,
    onboarded: detailsSubmitted && chargesEnabled && payoutsEnabled,
    missing,
    disabledReason: req?.disabled_reason ?? null,
  };
}
