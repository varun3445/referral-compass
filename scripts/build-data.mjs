// Builds data/providers.json, data/meta.json and data/match-review.json
// from public NHS England, CQC, ODS and postcodes.io data.
//
// Inputs (see BUILD_LOG.md for where each came from):
//   data/raw/rtt.csv            NHS England RTT full CSV extract (Aug 2026)
//   data/raw/cqc-providers.csv  CQC Latest ratings, "Providers" sheet
//                               (made by scripts/extract-cqc.mjs)
//   data/manual-matches.json    Hand-confirmed CQC matches { "ODS": "CQC Provider ID" }
//
// Usage: node scripts/build-data.mjs

import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const RAW = 'data/raw';
const OUT = 'data';

const CONFIG = {
  rttMonth: '2026-08',
  rttLabel: 'Aug 2026',
  rttSourceUrl: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-2026-27/',
  cqcFileDate: '2026-10-01',
  cqcDownloaded: '2026-11-03',
  cqcSourceUrl: 'https://www.cqc.org.uk/about-us/transparency/using-cqc-data',
  odsSourceUrl: 'https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations/',
  center: { lat: 51.5074, lng: -0.1278 },
  radiusKm: 80,
  matchThreshold: 0.9,
  // Pairs with fewer people waiting than this are shown as "small numbers"
  // and left out of the ranking (a median from 4 patients is noise).
  minWaitingForRanking: 50,
  // Specialist or community trusts: most GPs would not refer a routine
  // patient here, so they get a visible tag. Reviewed by hand (G1 gate).
  specialistTrusts: {
    RPY: 'Specialist cancer trust',
    RAN: 'Specialist orthopaedic trust',
    RPC: 'Specialist plastics, burns and eye trust',
    RGM: 'Specialist heart and lung trust',
    RYY: 'Community health trust',
    RDR: 'Community health trust',
  },
  // Treatment function codes as they appear in the file (prefixed "C_").
  // Pain Management (191) is not published separately (it sits inside
  // "Other" groups), so it is deliberately left out.
  specialties: {
    '410': 'Rheumatology',
    '110': 'Trauma & Orthopaedics',
    '330': 'Dermatology',
    '301': 'Gastroenterology',
    '320': 'Cardiology',
  },
};

// ---------- helpers ----------

// Minimal CSV line parser (handles quoted fields with commas and "" escapes).
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function readCsv(path, onRow) {
  const rl = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  let header = null;
  for await (let line of rl) {
    if (!header) { header = parseCsvLine(line.replace(/^﻿/, '')); continue; }
    if (!line) continue;
    const cells = parseCsvLine(line);
    const row = {};
    header.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    onRow(row);
  }
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const round1 = (n) => Math.round(n * 10) / 10;

// Percentile from weekly buckets, interpolating linearly inside the bucket.
// buckets[i] = patients waiting between i and i+1 weeks; last = 104+ weeks.
function percentileWeeks(buckets, total, p) {
  const target = total * p;
  let cum = 0;
  for (let i = 0; i < buckets.length; i++) {
    const n = buckets[i];
    if (n > 0 && cum + n >= target) {
      if (i === buckets.length - 1) return 104; // open-ended 104+ bucket: report lower bound
      return i + (target - cum) / n;
    }
    cum += n;
  }
  return null;
}

// The inputs behind a percentile, so the UI can show the working:
// weeks = lowerWeek + (target - before) / inBucket
function percentileWorking(buckets, total, p) {
  const target = total * p;
  let cum = 0;
  for (let i = 0; i < buckets.length; i++) {
    const n = buckets[i];
    if (n > 0 && cum + n >= target) {
      return { target: round1(target), lowerWeek: i, before: cum, inBucket: n, openEnded: i === buckets.length - 1 };
    }
    cum += n;
  }
  return null;
}

// Name normalisation for fuzzy matching.
const STOP = new Set(['nhs', 'foundation', 'trust', 'the', 'and', 'of', 'ft', 'university', 'hospitals', 'hospital']);
function nameTokens(name) {
  return name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter((t) => t && !STOP.has(t));
}
// Dice coefficient on token sets (0..1).
function nameSimilarity(a, b) {
  const A = new Set(nameTokens(a));
  const B = new Set(nameTokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return (2 * inter) / (A.size + B.size);
}

function ukDateToIso(d) {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

async function fetchJson(url, opts = {}, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(20000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// ---------- 1. RTT waiting times ----------

async function loadRtt() {
  const wanted = new Set(Object.keys(CONFIG.specialties).map((c) => `C_${c}`));
  const bucketCols = [];
  for (let i = 0; i < 104; i++) {
    bucketCols.push(`Gt ${String(i).padStart(2, '0')} To ${String(i + 1).padStart(2, '0')} Weeks SUM 1`);
  }
  bucketCols.push('Gt 104 Weeks SUM 1');

  const agg = new Map(); // key ods|tf -> { buckets, total, name }
  let period = null;
  let checkedCols = false;

  await readCsv(`${RAW}/rtt.csv`, (row) => {
    if (!checkedCols) {
      const missing = bucketCols.filter((c) => !(c in row));
      if (missing.length) throw new Error(`RTT columns missing: ${missing.slice(0, 3).join(', ')}…`);
      checkedCols = true;
    }
    if (row['RTT Part Description'] !== 'Incomplete Pathways') return;
    if (!wanted.has(row['Treatment Function Code'])) return;
    period = row.Period;
    const ods = row['Provider Org Code'];
    const tf = row['Treatment Function Code'].replace('C_', '');
    const key = `${ods}|${tf}`;
    if (!agg.has(key)) agg.set(key, { ods, tf, name: row['Provider Org Name'], buckets: new Array(105).fill(0), total: 0 });
    const a = agg.get(key);
    // The "Total" column is blank on Incomplete Pathways rows, so the total
    // is the sum of the weekly buckets (excludes unknown clock start dates).
    bucketCols.forEach((c, i) => {
      const n = Number(row[c]) || 0;
      a.buckets[i] += n;
      a.total += n;
    });
  });

  const providers = new Map(); // ods -> { odsCode, rttName, specialties }
  for (const a of agg.values()) {
    if (a.total <= 0) continue;
    const within18 = a.buckets.slice(0, 18).reduce((s, n) => s + n, 0);
    if (!providers.has(a.ods)) providers.set(a.ods, { odsCode: a.ods, rttName: a.name, specialties: {} });
    providers.get(a.ods).specialties[a.tf] = {
      name: CONFIG.specialties[a.tf],
      medianWeeks: round1(percentileWeeks(a.buckets, a.total, 0.5)),
      p92Weeks: round1(percentileWeeks(a.buckets, a.total, 0.92)),
      pctWithin18: round1((within18 / a.total) * 100),
      totalWaiting: a.total,
      within18,
      medianWorking: percentileWorking(a.buckets, a.total, 0.5),
      p92Working: percentileWorking(a.buckets, a.total, 0.92),
      smallNumbers: a.total < CONFIG.minWaitingForRanking,
    };
  }
  return { providers, period, aggCount: agg.size };
}

// ---------- 2. CQC ratings ----------

async function loadCqc() {
  const byId = new Map(); // CQC Provider ID -> { id, name, postcode, rating, date, url }
  await readCsv(`${RAW}/cqc-providers.csv`, (r) => {
    if (r['Provider Type'] !== 'NHS Healthcare Organisation') return;
    const id = r['Provider ID'];
    if (!byId.has(id)) byId.set(id, { id, name: r['Provider Name'], postcode: r['Provider Post Code'], url: r.URL, rating: null, date: null, wellLed: null });
    const p = byId.get(id);
    if (r['Service / Population Group'] === 'Overall' && r.Domain === 'Overall') {
      p.rating = r['Latest Rating'];
      p.date = ukDateToIso(r['Publication Date']);
    }
    // Some trusts only have a trust-level Well-led rating (CQC's newer
    // assessment approach). Kept as context, never used as the overall score.
    if (r['Service / Population Group'] === 'Well-led' && r.Domain === 'Overall' && r['Report Type'] === 'Provider') {
      p.wellLed = { rating: r['Latest Rating'], date: ukDateToIso(r['Publication Date']) };
    }
  });
  return byId;
}

function matchCqc(provider, cqc, manual) {
  const ods = provider.odsCode;
  // Manual confirmation wins.
  if (manual[ods] && cqc.has(manual[ods])) {
    return { cqc: cqc.get(manual[ods]), method: 'manual', confidence: 1 };
  }
  // For NHS trusts the CQC Provider ID is the ODS code.
  if (cqc.has(ods)) return { cqc: cqc.get(ods), method: 'ods-code', confidence: 1 };
  // Fallback: fuzzy name match.
  let best = null;
  for (const c of cqc.values()) {
    const s = nameSimilarity(provider.rttName, c.name);
    if (!best || s > best.confidence) best = { cqc: c, method: 'fuzzy-name', confidence: s };
  }
  return best;
}

// ---------- 3. Location ----------

async function loadOdsPostcodes(codes) {
  const cachePath = `${RAW}/ods-cache.json`;
  const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
  const todo = codes.filter((c) => !(c in cache));
  const CONCURRENCY = 6;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    await Promise.all(todo.slice(i, i + CONCURRENCY).map(async (code) => {
      try {
        const j = await fetchJson(`${CONFIG.odsSourceUrl}${code}`);
        cache[code] = j?.Organisation?.GeoLoc?.Location?.PostCode || null;
      } catch (e) {
        console.warn(`  ODS lookup failed for ${code}: ${e.message}`);
      }
    }));
  }
  writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  return cache;
}

async function geocode(postcodes) {
  const unique = [...new Set(postcodes.filter(Boolean))];
  const out = {};
  for (let i = 0; i < unique.length; i += 100) {
    const batch = unique.slice(i, i + 100);
    const j = await fetchJson('https://api.postcodes.io/postcodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postcodes: batch }),
    });
    for (const r of j.result) {
      if (r.result) out[r.query] = { lat: r.result.latitude, lng: r.result.longitude };
    }
  }
  // Retry misses against terminated postcodes (trust HQs sometimes move).
  for (const pc of unique.filter((p) => !out[p])) {
    const j = await fetchJson(`https://api.postcodes.io/terminated_postcodes/${encodeURIComponent(pc)}`).catch(() => null);
    if (j?.result) out[pc] = { lat: j.result.latitude, lng: j.result.longitude, terminated: true };
  }
  return out;
}

// ---------- main ----------

async function main() {
  console.log('1. Reading RTT…');
  const { providers: rtt, period, aggCount } = await loadRtt();
  // NHS trusts have 3-character codes starting R or T. Independent sector
  // providers (e.g. "A0C5S") are out of scope for this version.
  const trusts = [...rtt.values()].filter((p) => /^[RT][A-Z0-9]{2}$/.test(p.odsCode));
  console.log(`   period=${period}, provider×specialty rows=${aggCount}, providers=${rtt.size}, NHS trusts=${trusts.length}`);

  console.log('2. Reading CQC…');
  const cqc = await loadCqc();
  const manualPath = `${OUT}/manual-matches.json`;
  const manual = existsSync(manualPath) ? JSON.parse(readFileSync(manualPath, 'utf8')) : {};
  console.log(`   CQC NHS providers=${cqc.size}, with overall rating=${[...cqc.values()].filter((c) => c.rating).length}`);

  console.log('3. ODS postcodes…');
  const odsPc = await loadOdsPostcodes(trusts.map((t) => t.odsCode));

  const review = [];
  for (const t of trusts) {
    const m = matchCqc(t, cqc, manual);
    const accepted = m && m.confidence >= CONFIG.matchThreshold;
    review.push({
      odsCode: t.odsCode, rttName: t.rttName,
      cqcId: m?.cqc.id ?? null, cqcName: m?.cqc.name ?? null,
      method: m?.method ?? null, confidence: m ? Math.round(m.confidence * 100) / 100 : 0,
      accepted, cqcHasOverallRating: Boolean(m?.cqc.rating),
    });
    t.cqcMatch = accepted ? m : null;
    t.postcode = odsPc[t.odsCode] || (accepted ? m.cqc.postcode : null);
    t.postcodeSource = odsPc[t.odsCode] ? 'ODS' : (t.postcode ? 'CQC' : null);
  }

  console.log('4. Geocoding via postcodes.io…');
  const geo = await geocode(trusts.map((t) => t.postcode));

  const output = [];
  const dropped = { noLocation: [], outsideRadius: 0 };
  for (const t of trusts) {
    const loc = geo[t.postcode];
    if (!loc) { dropped.noLocation.push(t.odsCode); continue; }
    const distFromCentre = haversineKm(CONFIG.center, loc);
    if (distFromCentre > CONFIG.radiusKm) { dropped.outsideRadius++; continue; }
    const c = t.cqcMatch?.cqc;
    output.push({
      odsCode: t.odsCode,
      name: c?.name || t.rttName,
      rttName: t.rttName,
      isSpecialist: t.odsCode in CONFIG.specialistTrusts,
      specialistNote: CONFIG.specialistTrusts[t.odsCode] || null,
      postcode: t.postcode,
      postcodeSource: t.postcodeSource,
      lat: round1000(loc.lat), lng: round1000(loc.lng),
      cqc: {
        rating: c?.rating || null,
        date: c?.rating ? c.date : null,
        url: c?.url || null,
        matchConfidence: t.cqcMatch ? Math.round(t.cqcMatch.confidence * 100) / 100 : null,
        matchMethod: t.cqcMatch?.method || null,
        unavailableReason: !t.cqcMatch ? 'No confident CQC match'
          : !c.rating ? (c.wellLed ? 'CQC has published a trust-level Well-led rating only, no overall rating' : 'No trust-wide overall rating published') : null,
        wellLed: c?.wellLed || null,
      },
      specialties: t.specialties,
    });
  }
  output.sort((a, b) => a.name.localeCompare(b.name));

  const meta = {
    rttMonth: CONFIG.rttMonth,
    rttLabel: CONFIG.rttLabel,
    rttPeriod: period,
    rttSourceUrl: CONFIG.rttSourceUrl,
    cqcFileDate: CONFIG.cqcFileDate,
    cqcDownloaded: CONFIG.cqcDownloaded,
    cqcSourceUrl: CONFIG.cqcSourceUrl,
    odsSourceUrl: CONFIG.odsSourceUrl,
    specialties: CONFIG.specialties,
    radiusKm: CONFIG.radiusKm,
    minWaitingForRanking: CONFIG.minWaitingForRanking,
    center: CONFIG.center,
    providerCount: output.length,
    builtAt: new Date().toISOString().slice(0, 10),
  };

  writeFileSync(`${OUT}/providers.json`, JSON.stringify(output, null, 2));
  writeFileSync(`${OUT}/meta.json`, JSON.stringify(meta, null, 2));
  writeFileSync(`${OUT}/match-review.json`, JSON.stringify(review.sort((a, b) => a.confidence - b.confidence), null, 2));
  if (!existsSync(manualPath)) writeFileSync(manualPath, '{}\n');

  console.log(`\nDone. ${output.length} trusts within ${CONFIG.radiusKm} km of central London.`);
  console.log(`   dropped: ${dropped.outsideRadius} outside radius, ${dropped.noLocation.length} with no location ${dropped.noLocation.join(' ')}`);
}

function round1000(n) { return Math.round(n * 1e5) / 1e5; }

main().catch((e) => { console.error(e); process.exit(1); });
