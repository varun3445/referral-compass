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

// Looks up a postcode with postcodes.io. Returns { postcode, lat, lng } or
// throws with a message suitable for showing the GP. Nothing is stored.
export async function lookupPostcode(raw, signal) {
  const pc = raw.trim();
  const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`, { signal });
  if (res.status === 404) throw new Error('Postcode not found. Check it and try again.');
  if (!res.ok) throw new Error('Postcode lookup is unavailable right now. Try again shortly.');
  const { result } = await res.json();
  if (result.country !== 'England') {
    throw new Error(`This postcode is in ${result.country}. Referral Compass covers England only.`);
  }
  return { postcode: result.postcode, lat: result.latitude, lng: result.longitude };
}
