/**
 * Who pays for a wash.
 *
 * Lavo started with one answer — the person whose car it is — which is right
 * for an apartment building and wrong for a commercial one. In an office park
 * the buying relationship is with the property, not the driver, and the wash is
 * an amenity the property funds. Both have to work, and a manager should not
 * need a different product for each.
 *
 * Three arrangements, set per agreement:
 *
 *   occupant_pays        The occupant pays the full price at checkout. The
 *                        original behaviour and still the default, so nothing
 *                        changes for a building that never touches this.
 *   property_pays        The property's card on file is charged; the occupant
 *                        books without paying.
 *   property_subsidized  The property covers a fixed amount per wash and the
 *                        occupant pays the remainder.
 *
 * Add-ons are deliberately excluded from all of this. A property funds the
 * wash it agreed to fund; a ceramic coating an occupant ticks at checkout is
 * their own purchase. Folding add-ons into the property's bill would let any
 * occupant spend the property's money without the property ever agreeing to
 * the amount.
 *
 * Everything here is pure and client-safe, so the booking form quotes the same
 * number the charge uses. Regression tests: scripts/billing-arrangement-test.ts.
 */

export const BILLING_MODES = ['occupant_pays', 'property_pays', 'property_subsidized'] as const;
export type BillingMode = (typeof BILLING_MODES)[number];

export const DEFAULT_BILLING_MODE: BillingMode = 'occupant_pays';

export type BillingSplit = {
  mode: BillingMode;
  /** Charged to the occupant at checkout, before add-ons. */
  occupantCents: number;
  /** Charged to the property's card on file. */
  propertyCents: number;
  /** True when the property owes something, so a card on file is required. */
  requiresPropertyCard: boolean;
};

export function isBillingMode(value: unknown): value is BillingMode {
  return typeof value === 'string' && (BILLING_MODES as readonly string[]).includes(value);
}

/** Anything unrecognised falls back to the original behaviour rather than to free. */
export function normalizeBillingMode(value: unknown): BillingMode {
  return isBillingMode(value) ? value : DEFAULT_BILLING_MODE;
}

function cents(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/**
 * Split the price of one wash between the occupant and the property.
 *
 * `washCents` is the wash alone. Add-ons are the occupant's regardless of
 * arrangement and are added by the caller after this returns.
 */
export function resolveBillingSplit(args: {
  mode: unknown;
  washCents: unknown;
  /** Only meaningful for property_subsidized. */
  subsidyCents?: unknown;
}): BillingSplit {
  const mode = normalizeBillingMode(args.mode);
  const wash = cents(args.washCents);

  if (mode === 'property_pays') {
    return { mode, occupantCents: 0, propertyCents: wash, requiresPropertyCard: wash > 0 };
  }

  if (mode === 'property_subsidized') {
    // A subsidy larger than the wash covers the wash and no more — it must
    // never hand the occupant a negative balance, nor bill the property for
    // more than the wash costs.
    const property = Math.min(cents(args.subsidyCents), wash);
    return {
      mode,
      occupantCents: wash - property,
      propertyCents: property,
      requiresPropertyCard: property > 0,
    };
  }

  return { mode, occupantCents: wash, propertyCents: 0, requiresPropertyCard: false };
}

/** Manager-facing one-liner, used on the settings page and in the agreement. */
export function describeBillingArrangement(mode: BillingMode, subsidyCents?: number | null): string {
  if (mode === 'property_pays') {
    return 'The property pays for every wash. Occupants book at no charge to themselves.';
  }
  if (mode === 'property_subsidized') {
    const amount = cents(subsidyCents);
    const dollars = (amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    return amount > 0
      ? `The property covers ${dollars} of each wash and the occupant pays the remainder.`
      : 'The property covers part of each wash and the occupant pays the remainder.';
  }
  return 'Each occupant pays for their own wash at checkout. The property is never charged.';
}
