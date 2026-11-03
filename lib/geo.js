// Straight-line distance between two points on Earth, in km (haversine).
export function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Full postcode ("WC2N 5DU") or outcode only ("WC2N").
const FULL = /^([A-Z]{1,2}\d[A-Z\d]?)\s*\d[A-Z]{2}$/i;
const OUTCODE = /^([A-Z]{1,2}\d[A-Z\d]?)$/i;

// Returns the outcode ("WC2N"), or null if the input is not a postcode yet.
export function toOutcode(raw) {
  const s = raw.trim();
  const m = s.match(FULL) || s.match(OUTCODE);
  return m ? m[1].toUpperCase() : null;
}

export class LookupError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // 'not-found' | 'outside-england' | 'unavailable'
  }
}

// Privacy: only the outcode (first half, e.g. "WC2N", several thousand
// addresses) ever leaves the browser. Returns the outcode's centre point.
export async function lookupOutcode(outcode, signal) {
  let res;
  try {
    res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(outcode)}`, { signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new LookupError('unavailable', 'We could not check the postcode just now. Try again in a moment.');
  }
  if (res.status === 404) throw new LookupError('not-found', `We could not find ${outcode}. Check the postcode and try again.`);
  if (!res.ok) throw new LookupError('unavailable', 'We could not check the postcode just now. Try again in a moment.');
  const { result } = await res.json();
  if (!result.country?.includes('England')) {
    throw new LookupError('outside-england', `${outcode} is outside England. Referral Compass only covers trusts in England.`);
  }
  return { outcode: result.outcode, lat: result.latitude, lng: result.longitude };
}
