/**
 * Governing law for a service agreement.
 *
 * The agreement reads "the laws of the State of X", so X has to be the state
 * the building actually sits in — a Hoboken building's agreement said
 * "Delaware" because the operator-side send path never set governing_law and
 * the column default filled it in (QA, July 2026).
 *
 * Buildings store `region` as free text typed at onboarding, so it comes in as
 * either a postal code ("NJ") or a full name ("New Jersey"); both have to
 * render as the full name for the sentence to read correctly.
 */

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia', PR: 'Puerto Rico',
};

/** Fallback for the blank template preview, where no building exists yet. */
export const DEFAULT_GOVERNING_LAW = 'Delaware';

/**
 * Resolve a building's `region` to the state name the agreement should name.
 * Falls back to the stored value (then the default) when the region is blank
 * or isn't a state we recognize, so an odd entry never blanks the clause.
 */
export function resolveGoverningLaw(
  region?: string | null,
  storedGoverningLaw?: string | null,
): string {
  const raw = region?.trim();
  if (raw) {
    const code = raw.toUpperCase();
    if (STATE_NAMES[code]) return STATE_NAMES[code];

    const match = Object.values(STATE_NAMES).find((n) => n.toLowerCase() === raw.toLowerCase());
    if (match) return match;

    return raw;
  }
  return storedGoverningLaw?.trim() || DEFAULT_GOVERNING_LAW;
}
