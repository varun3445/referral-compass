'use client';
import { useEffect, useRef } from 'react';
import meta from '@/data/meta.json';
import CqcBadge from './CqcBadge';
import { QUALITY_SCORE, UNRATED_QUALITY_SCORE } from '@/lib/rank';
import { weeks, km, count, monthYear, yearsAgo, isOlderThan2Years } from '@/lib/format';
import styles from './EvidenceDrawer.module.css';

const RTT_SOURCE = { label: `NHS England RTT, incomplete pathways`, date: meta.rttLabel, href: meta.rttSourceUrl };
const CQC_SOURCE = { label: 'CQC Latest ratings file', date: monthYear(meta.cqcFileDate), href: meta.cqcSourceUrl };
const LOC_SOURCE = { label: 'NHS ODS (trust HQ postcode) + postcodes.io', date: `built ${monthYear(meta.builtAt)}`, href: meta.odsSourceUrl };
const RANK_SOURCE = { label: 'Calculated here from the numbers above', date: meta.rttLabel };

const n2 = (x) => x.toFixed(2);
const k1 = (x) => x.toFixed(1); // formulas show 1 dp so the arithmetic checks out

function Source({ s }) {
  return (
    <p className={styles.source}>
      Source · {s.href ? <a href={s.href} target="_blank" rel="noopener">{s.label}</a> : s.label} · {s.date}
    </p>
  );
}

// One fact: label, value, the working behind it, and where it came from.
function Fact({ label, value, formula, source }) {
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd>
        <span className={styles.value}>{value}</span>
        {formula && <code className={styles.formula}>{formula}</code>}
        {source && <Source s={source} />}
      </dd>
    </div>
  );
}

// "3 + (98.5 − 89) ÷ 23 = 3.4"
function percentileFormula(w, result) {
  if (!w) return null;
  if (w.openEnded) return `Falls in the open-ended 104+ week group, so shown as 104 (lower bound)`;
  return `Week ${w.lowerWeek} + (${w.target} − ${count(w.before)} already counted) ÷ ${count(w.inBucket)} in that week = ${weeks(result)} weeks`;
}

export default function EvidenceDrawer({ result, ranking, outcode, specialtyName, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (result && !d.open) d.showModal();
    if (!result && d.open) d.close();
  }, [result]);

  const r = result;
  const p = r?.provider;
  const w = r?.wait;
  const { range, weights, consideredCount } = ranking || {};

  const gaps = r ? [
    'Waiting times are for the whole trust, not one hospital site or clinic.',
    'The median is how long people currently on the list have waited so far, not the time to an appointment.',
    !p.cqc.rating && `No CQC overall rating: ${p.cqc.unavailableReason}. A neutral quality score (${UNRATED_QUALITY_SCORE}) is used.`,
    p.cqc.rating && isOlderThan2Years(p.cqc.date) && `The CQC rating is ${yearsAgo(p.cqc.date)} years old. The trust may have changed since.`,
    'The CQC rating covers the whole trust, not this specialty.',
    p.isSpecialist && `${p.specialistNote}: may not accept routine referrals for every condition.`,
    'Distance is a straight line to the trust headquarters, not the clinic, and is measured from the centre of the patient’s postcode area.',
  ].filter(Boolean) : [];

  return (
    <dialog ref={ref} className={styles.drawer} onClose={onClose} aria-labelledby="evidence-title">
      {r && (
        <div className={styles.inner}>
          <header className={styles.head}>
            <div>
              <p className={styles.kicker}>Evidence · {specialtyName}</p>
              <h2 id="evidence-title">{p.name}</h2>
            </div>
            <button type="button" className={styles.close} onClick={() => ref.current.close()} autoFocus>
              Close<span className="visually-hidden"> evidence</span>
            </button>
          </header>

          <section className={styles.section}>
            <h3>Why it is ranked #{r.rank}</h3>
            <p className={styles.plain}>
              Ranked {r.rank} of {consideredCount} trusts within reach. {r.tradeOff} Scores are relative to the
              trusts shown for this search: 100 is the best of them, 0 the worst.
            </p>
            <dl>
              <Fact
                label="Wait score"
                value={Math.round(r.scores.wait * 100)}
                formula={`(longest ${weeks(range.maxWait)} − this ${weeks(w.medianWeeks)}) ÷ (longest ${weeks(range.maxWait)} − shortest ${weeks(range.minWait)}) = ${n2(r.scores.wait)}`}
              />
              <Fact
                label="Quality score"
                value={Math.round(r.scores.quality * 100)}
                formula={p.cqc.rating
                  ? `${p.cqc.rating} = ${QUALITY_SCORE[p.cqc.rating]}  (Outstanding 1 · Good 0.75 · Requires improvement 0.35 · Inadequate 0)`
                  : `No overall rating = neutral ${UNRATED_QUALITY_SCORE}`}
              />
              <Fact
                label="Distance score"
                value={Math.round(r.scores.distance * 100)}
                formula={`(furthest ${k1(range.maxKm)} − this ${k1(r.distanceKm)}) ÷ (furthest ${k1(range.maxKm)} − nearest ${k1(range.minKm)}) = ${n2(r.scores.distance)}`}
              />
              <Fact
                label="Overall score"
                value={Math.round(r.total * 100)}
                formula={`${weights.wait} × ${n2(r.scores.wait)} + ${weights.quality} × ${n2(r.scores.quality)} + ${weights.distance} × ${n2(r.scores.distance)} = ${n2(r.total)}`}
                source={RANK_SOURCE}
              />
            </dl>
          </section>

          <section className={styles.section}>
            <h3>Waiting time</h3>
            <dl>
              <Fact
                label="Median wait so far"
                value={`${weeks(w.medianWeeks)} weeks`}
                formula={`Target = ${count(w.totalWaiting)} × 0.5 = ${w.medianWorking?.target}. ${percentileFormula(w.medianWorking, w.medianWeeks)}`}
                source={RTT_SOURCE}
              />
              <Fact
                label="92nd percentile"
                value={`${weeks(w.p92Weeks)} weeks`}
                formula={`Target = ${count(w.totalWaiting)} × 0.92 = ${w.p92Working?.target}. ${percentileFormula(w.p92Working, w.p92Weeks)}`}
                source={RTT_SOURCE}
              />
              <Fact
                label="Waiting under 18 weeks"
                value={`${w.pctWithin18}%`}
                formula={`${count(w.within18)} ÷ ${count(w.totalWaiting)} × 100 = ${w.pctWithin18}%`}
                source={RTT_SOURCE}
              />
              <Fact
                label="People waiting"
                value={count(w.totalWaiting)}
                formula="Sum of weekly groups, all commissioners, known clock-start dates only"
                source={RTT_SOURCE}
              />
            </dl>
          </section>

          <section className={styles.section}>
            <h3>Quality</h3>
            <dl>
              <Fact
                label="CQC overall rating"
                value={<CqcBadge cqc={p.cqc} />}
                formula={p.cqc.rating
                  ? `Published ${monthYear(p.cqc.date)} (${yearsAgo(p.cqc.date)} years ago)${isOlderThan2Years(p.cqc.date) ? ' · older than 2 years' : ''}. Covers the whole trust, not ${specialtyName}.`
                  : p.cqc.unavailableReason}
                source={{ ...CQC_SOURCE, href: p.cqc.url || CQC_SOURCE.href, label: p.cqc.url ? 'CQC page for this trust' : CQC_SOURCE.label }}
              />
              {p.cqc.wellLed && (
                <Fact
                  label="Well-led (trust level)"
                  value={p.cqc.wellLed.rating}
                  formula={`Published ${monthYear(p.cqc.wellLed.date)}. About leadership, not an overall rating, so not used in the score.`}
                  source={CQC_SOURCE}
                />
              )}
            </dl>
          </section>

          <section className={styles.section}>
            <h3>Location</h3>
            <dl>
              <Fact
                label="Distance to trust HQ"
                value={`${km(r.distanceKm)} km`}
                formula={`Straight line (haversine) from the centre of ${outcode} to ${p.postcode} (${p.lat.toFixed(3)}, ${p.lng.toFixed(3)})`}
                source={LOC_SOURCE}
              />
            </dl>
            <p className={styles.plain}>The clinic the patient attends may be at a different site run by this trust.</p>
          </section>

          <section className={styles.section}>
            <h3>Missing or not comparable</h3>
            <ul className={styles.gaps}>{gaps.map((g) => <li key={g}>{g}</li>)}</ul>
          </section>
        </div>
      )}
    </dialog>
  );
}
