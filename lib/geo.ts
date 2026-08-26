const EARTH_RADIUS_MILES = 3958.8;

export function haversineMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.asin(Math.sqrt(a));
}

export function withinRadius(
  buildingLat: number, buildingLng: number,
  operatorLat: number, operatorLng: number,
  radiusMiles: number,
): boolean {
  return haversineMiles(buildingLat, buildingLng, operatorLat, operatorLng) <= radiusMiles;
}

/**
 * Commercial listings often carry a range or list of street numbers
 * ("30600-30800 Telegraph", "3250, 3290 and 3310 W. Big Beaver"). Geocoders only
 * match a single number, so collapse these to the first one before searching.
 * The lookahead requires a street name to follow, which keeps ZIP+4 intact.
 */
export function normalizeAddressQuery(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(\d{2,6})(?:\s*,\s*\d{2,6})+(?:\s*(?:and|&)\s*\d{2,6})?(?=\s+\D)/i, '$1')
    .replace(/\b(\d{2,6})\s*(?:and|&)\s*\d{2,6}(?=\s+\D)/i, '$1')
    .replace(/\b(\d{2,6})\s*[-–—]\s*\d{2,6}(?=\s+\D)/, '$1')
    .trim();
}

export function generateSlug(name: string, city: string): string {
  const base = `${name} ${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}
