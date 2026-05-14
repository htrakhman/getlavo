import crypto from 'crypto';

/** Stable key for aggregating demand for a place before a buildings row exists. */
export function buildingCandidateKey(placeId: string | null | undefined, formattedAddress: string) {
  const pid = placeId?.trim();
  if (pid) return `place:${pid}`;
  const norm = formattedAddress.trim().toLowerCase().replace(/\s+/g, ' ');
  const h = crypto.createHash('sha256').update(norm).digest('hex').slice(0, 24);
  return `addr:${h}`;
}

export function randomShareToken(len = 10) {
  const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
  let s = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) s += alphabet[bytes[i]! % alphabet.length];
  return s;
}
