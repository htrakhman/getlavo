import crypto from 'crypto';

/** Stable key for aggregating demand for a place before a buildings row exists. */
export function normalizeLocationText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildingCandidateKey(placeId: string | null | undefined, formattedAddress: string) {
  const pid = placeId?.trim();
  if (pid) return `place:${pid}`;
  // Keep legacy normalization so existing waitlist keys still match.
  const norm = formattedAddress.trim().toLowerCase().replace(/\s+/g, ' ');
  const h = crypto.createHash('sha256').update(norm).digest('hex').slice(0, 24);
  return `addr:${h}`;
}

/** Extra addr: keys from a label or address string (resident form or building row). */
export function candidateKeysFromText(...values: (string | null | undefined)[]): string[] {
  const keys = new Set<string>();
  for (const raw of values) {
    const t = (raw ?? '').trim();
    if (t.length > 3) keys.add(buildingCandidateKey(null, t));
  }
  return [...keys];
}

/** Loose match for building name vs address vs resident-entered label. */
export function locationTextsMatch(a: string | null | undefined, b: string | null | undefined) {
  const na = normalizeLocationText(a ?? '');
  const nb = normalizeLocationText(b ?? '');
  if (!na || !nb || na.length < 4 || nb.length < 4) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function randomShareToken(len = 10) {
  const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
  let s = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) s += alphabet[bytes[i]! % alphabet.length];
  return s;
}
