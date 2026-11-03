// Checks the ranking against a hand calculation you can follow line by line.
//   1. Weights sum to 1 in all four modes.
//   2. Rheumatology, WC2N, 25 km, Balanced, CQC off: recompute every score
//      by hand (own distance maths, own normalising) and compare the top 5
//      with lib/rank.js.
// Usage: node checks/verify-ranking.mjs

import { readFileSync } from 'node:fs';
import { rankProviders, WEIGHTS, WEIGHTS_WITH_QUALITY } from '../lib/rank.js';

const providers = JSON.parse(readFileSync(new URL('../data/providers.json', import.meta.url)));
let failed = false;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failed = true; };

// ---------- 1. Weights ----------
console.log('\n1. Weights sum to 1\n');
for (const [setName, set] of [['CQC off', WEIGHTS], ['CQC on ', WEIGHTS_WITH_QUALITY]]) {
  for (const [priority, w] of Object.entries(set)) {
    const sum = w.wait + w.quality + w.distance;
    check(Math.abs(sum - 1) < 1e-9, `${setName}  ${priority.padEnd(8)} wait ${w.wait} + quality ${w.quality} + distance ${w.distance} = ${+sum.toFixed(10)}`);
  }
}
check(WEIGHTS.fastest.quality === 0 && WEIGHTS.balanced.quality === 0, 'CQC off: quality weight is 0 in both modes');

// ---------- 2. Hand calculation ----------
const OUTCODE = 'WC2N';
let origin = { lat: 51.50998, lng: -0.12384 }; // fallback: WC2N centre from postcodes.io
try {
  const r = await fetch(`https://api.postcodes.io/outcodes/${OUTCODE}`, { signal: AbortSignal.timeout(8000) });
  const { result } = await r.json();
  origin = { lat: result.latitude, lng: result.longitude };
} catch { console.log('\n(postcodes.io unreachable, using saved WC2N centre)'); }

const SPECIALTY = '410';
const MAX_KM = 25;
const W = { wait: 0.55, distance: 0.45 }; // Balanced, CQC off

// Independent haversine, written out again on purpose.
function km(a, b) {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Pool: has Rheumatology data, 50+ waiting, not a specialist trust, within 25 km.
const pool = providers
  .filter((p) => p.specialties[SPECIALTY] && !p.specialties[SPECIALTY].smallNumbers && !p.isSpecialist)
  .map((p) => ({ ods: p.odsCode, name: p.name, median: p.specialties[SPECIALTY].medianWeeks, km: km(origin, p) }))
  .filter((p) => p.km <= MAX_KM);

const longest = Math.max(...pool.map((p) => p.median));
const shortest = Math.min(...pool.map((p) => p.median));
const furthest = Math.max(...pool.map((p) => p.km));
const closest = Math.min(...pool.map((p) => p.km));

for (const p of pool) {
  p.waitScore = (longest - p.median) / (longest - shortest);
  p.distScore = (furthest - p.km) / (furthest - closest);
  p.total = W.wait * p.waitScore + W.distance * p.distScore;
}
pool.sort((a, b) => b.total - a.total || a.median - b.median);

console.log(`\n2. Rheumatology, ${OUTCODE} (${origin.lat.toFixed(5)}, ${origin.lng.toFixed(5)}), ${MAX_KM} km, Balanced, CQC off\n`);
console.log(`   ${pool.length} trusts in the pool`);
console.log(`   Waiting so far: shortest ${shortest} wks, longest ${longest} wks  -> wait score = (${longest} - median) / (${longest} - ${shortest})`);
console.log(`   Distance:       closest ${closest.toFixed(1)} km, furthest ${furthest.toFixed(1)} km  -> distance score = (${furthest.toFixed(1)} - km) / (${furthest.toFixed(1)} - ${closest.toFixed(1)})`);
console.log(`   Total = ${W.wait} x wait score + ${W.distance} x distance score\n`);

const short = (s) => s.replace(/ NHS Foundation Trust$| NHS Trust$/, '');
const row = (cells) => '   ' + cells.map(([v, w, right]) => (right ? String(v).padStart(w) : String(v).padEnd(w))).join('  ');
console.log(row([['#', 2], ['Trust', 38], ['Median', 6, 1], ['km', 5, 1], ['Wait score', 26], ['Dist score', 26], ['Total', 5, 1]]));
console.log('   ' + '-'.repeat(118));
pool.slice(0, 8).forEach((p, i) => {
  console.log(row([
    [i + 1, 2], [short(p.name), 38], [p.median.toFixed(1), 6, 1], [p.km.toFixed(1), 5, 1],
    [`(${longest}-${p.median})/${(longest - shortest).toFixed(1)} = ${p.waitScore.toFixed(3)}`, 26],
    [`(${furthest.toFixed(1)}-${p.km.toFixed(1)})/${(furthest - closest).toFixed(1)} = ${p.distScore.toFixed(3)}`, 26],
    [p.total.toFixed(3), 5, 1],
  ]));
});
console.log('   (rows 6 to 8 shown so you can see the gap below the top 5)\n');

const app = rankProviders({ providers, origin, specialty: SPECIALTY, maxKm: MAX_KM, priority: 'balanced' });
const handTop5 = pool.slice(0, 5).map((p) => p.ods);
const appTop5 = app.results.map((r) => r.provider.odsCode);
check(app.consideredCount === pool.length, `pool size: hand ${pool.length}, app ${app.consideredCount}`);
check(JSON.stringify(handTop5) === JSON.stringify(appTop5), `top 5 order: hand ${handTop5.join(' ')} | app ${appTop5.join(' ')}`);
check(app.results.every((r, i) => Math.abs(r.total - pool[i].total) < 1e-9), 'top 5 totals match to 9 decimal places');
check(app.results.every((r) => r.weights.quality === 0), 'CQC off: no result uses a quality weight');

// For comparison: the same search with CQC included (old weights).
const withCqc = rankProviders({ providers, origin, specialty: SPECIALTY, maxKm: MAX_KM, priority: 'balanced', includeQuality: true });
console.log('\n   Same search with "Include CQC rating" ticked (0.4 / 0.3 / 0.3):');
withCqc.results.forEach((r) => console.log(`   ${r.rank}  ${short(r.provider.name).padEnd(38)} ${r.total.toFixed(3)}  ${r.provider.cqc.rating || 'no rating'}`));
console.log(`\n   Close call (top two within 0.03): CQC off ${app.closeCall ? 'yes' : 'no'} (${(app.results[0].total - app.results[1].total).toFixed(3)}), CQC on ${withCqc.closeCall ? 'yes' : 'no'} (${(withCqc.results[0].total - withCqc.results[1].total).toFixed(3)})`);

console.log(failed ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
