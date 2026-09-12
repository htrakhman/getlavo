/**
 * How Lavo may describe itself in public copy.
 *
 * This is one constant because it was two hardcoded strings that both said
 * "Lavo, Inc." — a corporation that does not exist. Lavo is operated as a sole
 * proprietorship, so there is no separate legal person: "Lavo" is a name the
 * owner trades under, and a claim of incorporation on a public page is false.
 *
 * It matters beyond tidiness. The service agreement asks a commercial landlord
 * to accept that claims go to the operator and not to Lavo, and a counterparty
 * who later finds the "Inc." was invented has an argument about what else was
 * represented to them. Holding yourself out as a corporation you have not
 * formed also does nothing to limit liability — only actually forming the
 * entity does that.
 *
 * WHEN AN ENTITY IS FORMED: set this to the exact registered name, including
 * the suffix as filed ("Lavo LLC", "Lavo, Inc."). It must match the filing
 * exactly, and the contracts, Stripe account and bank account should name the
 * same entity. Do not set it in anticipation of a filing.
 */
export const LEGAL_ENTITY_NAME = 'Lavo';

/** Copyright line for the site footer. */
export function copyrightLine(year: number = new Date().getFullYear()): string {
  return `© ${year} ${LEGAL_ENTITY_NAME}`;
}
