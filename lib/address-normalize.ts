/**
 * Address normalization for demand aggregation.
 *
 * The problem: residents at one building type their address five different
 * ways — "123 Main St", "123 Main Street", "123 main st.", "123 Main St Apt
 * 4B", "123 Main Street, Unit 12, Jersey City NJ 07302". Grouped raw, that one
 * building becomes five prospects with one signup each instead of one prospect
 * with five, which is exactly backwards for a list sorted by demand.
 *
 * `buildingCandidateKey` in `lib/building-candidate.ts` does not solve this and
 * is not meant to: it hashes the lowercased string, so any spelling difference
 * produces a different key, and a Google-autocompleted pick produces a
 * `place:` key that can never match a hand-typed `addr:` key for the same
 * building. Both remain in use for their existing purposes; this module is what
 * the prospecting view groups on.
 *
 * The output is a readable canonical string plus a compact key. Readability is
 * deliberate — an opaque hash makes a wrong grouping impossible to diagnose.
 */

/** Canonical USPS-style suffix abbreviations. Many spellings collapse to one. */
const STREET_SUFFIXES: Record<string, string> = {
  street: 'st',
  st: 'st',
  str: 'st',
  avenue: 'ave',
  av: 'ave',
  ave: 'ave',
  aven: 'ave',
  boulevard: 'blvd',
  blvd: 'blvd',
  boul: 'blvd',
  road: 'rd',
  rd: 'rd',
  drive: 'dr',
  dr: 'dr',
  driv: 'dr',
  lane: 'ln',
  ln: 'ln',
  court: 'ct',
  ct: 'ct',
  crt: 'ct',
  place: 'pl',
  pl: 'pl',
  plaza: 'plz',
  plz: 'plz',
  terrace: 'ter',
  ter: 'ter',
  terr: 'ter',
  parkway: 'pkwy',
  pkwy: 'pkwy',
  pkway: 'pkwy',
  circle: 'cir',
  cir: 'cir',
  square: 'sq',
  sq: 'sq',
  trail: 'trl',
  trl: 'trl',
  highway: 'hwy',
  hwy: 'hwy',
  expressway: 'expy',
  expy: 'expy',
  turnpike: 'tpke',
  tpke: 'tpke',
  extension: 'ext',
  ext: 'ext',
  heights: 'hts',
  hts: 'hts',
  landing: 'lndg',
  lndg: 'lndg',
  point: 'pt',
  pt: 'pt',
  ridge: 'rdg',
  rdg: 'rdg',
  way: 'way',
  walk: 'walk',
  loop: 'loop',
  row: 'row',
  run: 'run',
  alley: 'aly',
  aly: 'aly',
  crossing: 'xing',
  xing: 'xing',
  path: 'path',
  pike: 'pike',
  commons: 'cmns',
  cmns: 'cmns',
};

/** Directionals collapse to their initials: "North" and "N." both become "n". */
const DIRECTIONALS: Record<string, string> = {
  north: 'n',
  n: 'n',
  south: 's',
  s: 's',
  east: 'e',
  e: 'e',
  west: 'w',
  w: 'w',
  northeast: 'ne',
  ne: 'ne',
  northwest: 'nw',
  nw: 'nw',
  southeast: 'se',
  se: 'se',
  southwest: 'sw',
  sw: 'sw',
};

/** Spelled-out street numbers: "One Journal Square" and "1 Journal Sq" match. */
const WORD_NUMBERS: Record<string, string> = {
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
};

/** Word ordinals used in street names: "First Street" and "1st St" must match. */
const WORD_ORDINALS: Record<string, string> = {
  first: '1st',
  second: '2nd',
  third: '3rd',
  fourth: '4th',
  fifth: '5th',
  sixth: '6th',
  seventh: '7th',
  eighth: '8th',
  ninth: '9th',
  tenth: '10th',
  eleventh: '11th',
  twelfth: '12th',
};

/**
 * Tokens that introduce a unit designator. Everything from the first of these
 * to the end of that comma-segment is dropped — the unit is what makes two
 * residents of one building look like two buildings.
 */
const UNIT_TOKENS = new Set([
  'apt',
  'apartment',
  'unit',
  'ste',
  'suite',
  'fl',
  'flr',
  'floor',
  'rm',
  'room',
  'bldg',
  'building',
  'trlr',
  'lot',
  'no',
  'num',
  'number',
  'penthouse',
  'ph',
]);

const STATE_CODES: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
};

const STATE_CODE_SET = new Set(Object.values(STATE_CODES));

export type NormalizedAddress = {
  /** Readable canonical form, e.g. `123 Main St, Jersey City, NJ 07302`. */
  normalized: string;
  /** Grouping key, e.g. `123-main-st|07302`. Empty when nothing usable parsed. */
  key: string;
  streetNumber: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  /** Unit as entered, kept for display but never part of the key. */
  unit: string;
};

const EMPTY: NormalizedAddress = {
  normalized: '',
  key: '',
  streetNumber: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  unit: '',
};

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tokenize(value: string): string[] {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/[^\w\s#/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/**
 * Pull the unit out of a street segment.
 *
 * Handles the designator forms ("apt 4b", "unit 12", "#3"), and a bare trailing
 * token that is clearly a unit ("123 Main St 4B") while leaving a legitimate
 * trailing token alone.
 */
function extractUnit(tokens: string[]): { tokens: string[]; unit: string } {
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]!;

    if (token.startsWith('#')) {
      return { tokens: tokens.slice(0, i), unit: tokens.slice(i).join(' ') };
    }

    // A designator only counts after the street number, so "Unit Street" as a
    // street name is not mistaken for a unit marker at position 0.
    if (i > 0 && UNIT_TOKENS.has(token)) {
      return { tokens: tokens.slice(0, i), unit: tokens.slice(i).join(' ') };
    }
  }

  // Trailing token that looks like a unit rather than part of the street:
  // "4b", "12" after a suffix, "ph2". Requires a recognized suffix before it so
  // "100 Broadway" and "1 Observer Highway" survive intact.
  if (tokens.length >= 3) {
    const last = tokens[tokens.length - 1]!;
    const prev = tokens[tokens.length - 2]!;
    const prevIsSuffix = Boolean(STREET_SUFFIXES[prev]);
    const looksLikeUnit = /^\d{1,4}[a-z]?$/.test(last) || /^[a-z]\d{1,4}$/.test(last);
    if (prevIsSuffix && looksLikeUnit) {
      return { tokens: tokens.slice(0, -1), unit: last };
    }
  }

  return { tokens, unit: '' };
}

function canonicalizeStreetTokens(tokens: string[]): string[] {
  return tokens.map((token, index) => {
    if (WORD_ORDINALS[token]) return WORD_ORDINALS[token]!;

    // Directionals are only meaningful at the edges of a street name; "West"
    // in "Key West Ave" is part of the name.
    const atEdge = index === 0 || index === tokens.length - 1;
    if (atEdge && DIRECTIONALS[token]) return DIRECTIONALS[token]!;

    if (index === tokens.length - 1 && STREET_SUFFIXES[token]) return STREET_SUFFIXES[token]!;

    return token;
  });
}

/**
 * Parse a free-text or Google-formatted address into a canonical form.
 *
 * Tolerant by design: comma-separated input is used when present, and a single
 * unpunctuated line is still parsed by locating the ZIP and state.
 */
export function normalizeAddress(raw: string | null | undefined): NormalizedAddress {
  const input = (raw ?? '').trim();
  if (!input) return EMPTY;

  // Drop a trailing country segment so "…, NJ 07302, USA" parses like "…, NJ 07302".
  const segments = input
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !/^(usa|us|united states)$/i.test(segment));

  if (segments.length === 0) return EMPTY;

  const flat = segments.join(' ');
  const zip = flat.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? '';

  // State is searched only in the tail, never in the street segment: matching
  // full names against the whole string reads "450 Washington Blvd, Jersey
  // City, NJ" as Washington State.
  const stateHaystack =
    segments.length > 1 ? segments.slice(1).join(' ') : tokenize(flat).slice(-4).join(' ');

  let state = '';
  for (const [name, code] of Object.entries(STATE_CODES)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(stateHaystack)) {
      state = code;
      break;
    }
  }
  if (!state) {
    // Scan back-to-front: a two-letter state sits at the end, and scanning
    // forward would match a token like "Ok" earlier in the tail.
    const tokens = tokenize(stateHaystack);
    for (let i = tokens.length - 1; i >= 0; i -= 1) {
      const upper = tokens[i]!.toUpperCase();
      if (STATE_CODE_SET.has(upper)) {
        state = upper;
        break;
      }
    }
  }

  const streetSegment = segments[0]!;
  const { tokens: streetTokensRaw, unit } = extractUnit(tokenize(streetSegment));

  let streetNumber = '';
  let streetTokens = streetTokensRaw;
  const head = streetTokens[0];
  if (head && /^\d+[a-z]?(-\d+[a-z]?)?$/.test(head)) {
    streetNumber = head;
    streetTokens = streetTokens.slice(1);
  } else if (head && WORD_NUMBERS[head]) {
    // "One Journal Square" is a real building-address form around here.
    streetNumber = WORD_NUMBERS[head]!;
    streetTokens = streetTokens.slice(1);
  }

  // No street number means this is not a street address — "Jersey City, NJ"
  // must not become a prospect row whose street is "jersey city".
  if (!streetNumber) return { ...EMPTY, unit };

  const street = canonicalizeStreetTokens(streetTokens).join(' ');

  // City is the segment after the street, minus any state/zip tail. With no
  // commas there is nothing reliable to take, so it stays empty.
  let city = '';
  if (segments.length >= 2) {
    const candidate = segments[1]!;
    const cleaned = candidate
      .replace(/\b\d{5}(?:-\d{4})?\b/g, '')
      .replace(/\b[A-Za-z]{2}\b$/, '')
      .trim();
    const cityTokens = tokenize(cleaned).filter(
      (token) => !STATE_CODE_SET.has(token.toUpperCase()) && !UNIT_TOKENS.has(token),
    );
    city = cityTokens.join(' ');
  }

  const streetLine = [streetNumber, street].filter(Boolean).join(' ').trim();
  if (!streetLine) return { ...EMPTY, unit };

  // ZIP identifies a locality precisely; city+state is the fallback. Without
  // either, the street line alone groups — imprecise across towns, but it keeps
  // partial entries from each becoming their own prospect.
  const locality = zip || [city, state.toLowerCase()].filter(Boolean).join(' ');

  const key = [slug(streetLine), slug(locality)].filter(Boolean).join('|');

  return {
    normalized: formatNormalized({ streetLine, city, state, zip }),
    key,
    streetNumber,
    street,
    city: titleCase(city),
    state,
    zip,
    unit,
  };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function formatNormalized({
  streetLine,
  city,
  state,
  zip,
}: {
  streetLine: string;
  city: string;
  state: string;
  zip: string;
}): string {
  const street = titleCase(streetLine)
    // Suffix and directional abbreviations read better capitalized as units.
    .replace(/\b(St|Ave|Blvd|Rd|Dr|Ln|Ct|Pl|Ter|Pkwy|Cir|Sq|Hwy|Tpke|Plz)\b/g, (m) => m);
  const tail = [titleCase(city), [state, zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return [street, tail].filter(Boolean).join(', ');
}

/**
 * Best available grouping key for a waitlist row.
 *
 * A resolved `buildings.id` is authoritative and wins — two spellings that both
 * resolved to the same building must group even if the text differs. Address
 * text is the fallback for the unresolved case, which is most of the list.
 */
export function waitlistGroupKey(input: {
  buildingId?: string | null;
  addressKey?: string | null;
  candidateKey?: string | null;
}): string {
  if (input.buildingId) return `building:${input.buildingId}`;
  if (input.addressKey) return `addr:${input.addressKey}`;
  if (input.candidateKey) return `legacy:${input.candidateKey}`;
  return 'unknown';
}
