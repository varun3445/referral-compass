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

// Returns the outcode ("WC2N"), null if the input is not a postcode yet.
export function toOutcode(raw) {
  const s = raw.trim();
  const m = s.match(FULL) || s.match(OUTCODE);
  return m ? m[1].toUpperCase() : null;
}

// Privacy: only the outcode (first half, e.g. "WC2N", ~10,000 addresses)
// ever leaves the browser. The full postcode is never sent or stored.
// Returns the outcode's centre point.
export async function lookupOutcode(outcode, signal) {
  const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(outcode)}`, { signal });
  if (res.status === 404) throw new Error(`Postcode area ${outcode} not found. Check the postcode.`);
  if (!res.ok) throw new Error('Postcode lookup is unavailable right now. Try again shortly.');
  const { result } = await res.json();
  if (!result.country?.includes('England')) {
    throw new Error(`${outcode} is in ${result.country?.join(' / ') || 'another country'}. Referral Compass covers England only.`);
  }
  return { outcode: result.outcode, lat: result.latitude, lng: result.longitude };
}
