'use client';
import { useCallback, useEffect, useRef } from 'react';
import meta from '@/data/meta.json';
import CqcBadge from './CqcBadge';
import ScoreBars from './ScoreBars';
import Icon from './Icon';
import { QUALITY_SCORE, UNRATED_QUALITY_SCORE } from '@/lib/rank';
import { weeks, km, count, monthYear, yearsAgo, isOlderThan2Years } from '@/lib/format';
import { ratingAgeRange } from '@/lib/explain';
import providers from '@/data/providers.json';
import styles from './EvidenceDrawer.module.css';

const RTT_SOURCE = { label: 'NHS England RTT, patients still waiting', date: meta.rttLabel, href: meta.rttSourceUrl };
const CQC_SOURCE = { label: 'CQC Latest ratings file', date: monthYear(meta.cqcFileDate), href: meta.cqcSourceUrl };
const LOC_SOURCE = { label: 'NHS ODS (trust HQ postcode) and postcodes.io', date: monthYear(meta.builtAt), href: meta.odsSourceUrl };
const RANK_SOURCE = { label: 'Worked out here from the numbers below', date: meta.rttLabel };

const n2 = (x) => x.toFixed(2);
const k1 = (x) => x.toFixed(1); // formulas use 1 decimal so the arithmetic checks out
const CLOSE_MS = 250;
const AGE = ratingAgeRange(providers);

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

function percentileFormula(w, result) {
  if (!w) return null;
  if (w.openEnded) return 'Falls in the open ended 104+ week group, so shown as 104 (lower bound)';
  return `Week ${w.lowerWeek} + (${w.target} − ${count(w.before)} already counted) ÷ ${count(w.inBucket)} in that week = ${weeks(result)} weeks`;
}

export default function EvidenceDrawer({ result, ranking, outcode, specialtyName, onClose }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const closeTimer = useRef(null);

  // Open: show at the off-screen position, then flip to "open" so it slides in.
  useEffect(() => {
    const d = ref.current;
    if (result && (!d.open || d.dataset.state === 'closing')) {
      clearTimeout(closeTimer.current);
      if (!d.open) d.showModal();
      d.scrollTop = 0;
      void d.offsetWidth; // flush the off-screen start position so the slide-in runs
      d.dataset.state = 'open';
    }
  }, [result]);

  // Close: run the same path in reverse, then actually close.
  const requestClose = useCallback(() => {
    const d = ref.current;
    if (!d?.open || d.dataset.state === 'closing') return;
    d.style.transform = '';
    d.dataset.state = 'closing';
    // Finish when the slide-out ends; the timer is a fallback (e.g. reduced motion).
    const finish = () => {
      clearTimeout(closeTimer.current);
      d.removeEventListener('transitionend', onEnd);
      if (d.dataset.state !== 'closing') return; // reopened meanwhile
      d.close();
      d.dataset.state = '';
    };
    const onEnd = (e) => { if (e.target === d) finish(); };
    d.addEventListener('transitionend', onEnd);
    closeTimer.current = setTimeout(finish, CLOSE_MS + 100);
  }, []);

  // Esc fires "cancel": animate out instead of vanishing. Backdrop click closes too.
  useEffect(() => {
    const d = ref.current;
    const onCancel = (e) => { e.preventDefault(); requestClose(); };
    const onBackdrop = (e) => { if (e.target === d) requestClose(); };
    d.addEventListener('cancel', onCancel);
    d.addEventListener('click', onBackdrop);
    return () => { d.removeEventListener('cancel', onCancel); d.removeEventListener('click', onBackdrop); };
  }, [requestClose]);

  // Bottom sheet: drag the handle down to dismiss. Follows the finger 1:1.
  const onHandleDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, t0: performance.now(), dy: 0 };
    ref.current.style.transition = 'none';
  };
  const onHandleMove = (e) => {
    if (!drag.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y0);
    drag.current.dy = dy;
    ref.current.style.transform = `translateY(${dy}px)`;
  };
  const onHandleUp = () => {
    const d = ref.current;
    if (!drag.current) return;
    const { dy, t0 } = drag.current;
    const velocity = dy / Math.max(1, performance.now() - t0); // px per ms
    drag.current = null;
    d.style.transition = '';
    if (dy > 120 || velocity > 0.6) requestClose();
    else d.style.transform = '';
  };

  const r = result;
  const p = r?.provider;
  const w = r?.wait;
  const { range, weights, consideredCount, includeQuality } = ranking || {};

  const gaps = r ? [
    'Waiting times are for the whole trust, not one hospital or clinic.',
    'The median is how long people currently on the list have waited so far, not the time to an appointment.',
    !p.cqc.rating && (includeQuality
      ? `No CQC overall rating: ${p.cqc.unavailableReason}. A neutral quality score (${UNRATED_QUALITY_SCORE}) is used.`
      : `No CQC overall rating: ${p.cqc.unavailableReason}.`),
    p.cqc.rating && isOlderThan2Years(p.cqc.date) && `The CQC rating is ${yearsAgo(p.cqc.date)} years old. The trust may have changed since.`,
    'The CQC rating covers the whole trust, not this specialty.',
    p.isSpecialist && `${p.specialistNote}. It may not accept routine referrals for every condition.`,
    'Distance is a straight line to the trust headquarters, measured from the centre of the patient’s postcode area. The clinic may be elsewhere.',
  ].filter(Boolean) : [];

  return (
    <dialog ref={ref} className={styles.drawer} onClose={onClose} aria-labelledby="evidence-title">
      {r && (
        <>
          <div
            className={styles.handle}
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
            aria-hidden="true"
          >
            <span />
          </div>
          <header className={styles.head}>
            <div className={styles.headText}>
              <p className={styles.kicker}>Evidence · {specialtyName}</p>
              <h2 id="evidence-title" className={styles.title}>{p.name}</h2>
            </div>
            <button type="button" className={styles.close} onClick={requestClose} autoFocus>
              <Icon name="x" size={20} /> Close<span className="visually-hidden"> evidence</span>
            </button>
          </header>

          <div className={styles.body}>
            <section className={styles.section}>
              <h3>Why it is ranked {r.rank === 1 ? 'first' : `number ${r.rank}`}</h3>
              <p className={styles.plain}>Ranked {r.rank} of {consideredCount} trusts. {r.tradeOff}</p>
              <ScoreBars scores={r.scores} weights={weights} qualityFlagged={r.qualityFlagged} />
              {!includeQuality && (
                <p className={styles.plain}>
                  <strong>CQC rating: not used in the ranking.</strong> Ratings are {AGE.min} to {AGE.max} years old.
                  You can include them under More options.
                </p>
              )}
              <p className={styles.note}>
                Scores are relative to the options shown here: 100 is the best of them, 0 the worst. Overall score{' '}
                <strong>{Math.round(r.total * 100)}</strong>.
              </p>
              <dl className={styles.facts}>
                <Fact
                  label="Wait score"
                  value={Math.round(r.scores.wait * 100)}
                  formula={`(longest ${weeks(range.maxWait)} − this ${weeks(w.medianWeeks)}) ÷ (longest ${weeks(range.maxWait)} − shortest ${weeks(range.minWait)}) = ${n2(r.scores.wait)}`}
                />
                {includeQuality && (
                  <Fact
                    label="Quality score"
                    value={Math.round(r.scores.quality * 100)}
                    formula={p.cqc.rating
                      ? `${p.cqc.rating} = ${QUALITY_SCORE[p.cqc.rating]} (Outstanding 1, Good 0.75, Requires improvement 0.35, Inadequate 0)`
                      : `No overall rating = neutral ${UNRATED_QUALITY_SCORE}`}
                  />
                )}
                <Fact
                  label="Distance score"
                  value={Math.round(r.scores.distance * 100)}
                  formula={`(furthest ${k1(range.maxKm)} − this ${k1(r.distanceKm)}) ÷ (furthest ${k1(range.maxKm)} − closest ${k1(range.minKm)}) = ${n2(r.scores.distance)}`}
                />
                <Fact
                  label="Overall score"
                  value={Math.round(r.total * 100)}
                  formula={`${[['wait', 'wait'], ['quality', 'quality'], ['distance', 'distance']]
                    .filter(([k]) => weights[k] > 0)
                    .map(([k]) => `${weights[k]} × ${n2(r.scores[k])}`)
                    .join(' + ')} = ${n2(r.total)}`}
                  source={RANK_SOURCE}
                />
              </dl>
            </section>

            <section className={styles.section}>
              <h3>Waiting time</h3>
              <dl className={styles.facts}>
                <Fact
                  label="Waiting so far (median)"
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
                  label="Seen within 18 weeks"
                  value={`${w.pctWithin18}%`}
                  formula={`${count(w.within18)} ÷ ${count(w.totalWaiting)} × 100 = ${w.pctWithin18}%`}
                  source={RTT_SOURCE}
                />
                <Fact
                  label="People waiting"
                  value={count(w.totalWaiting)}
                  formula="Sum of weekly groups, all commissioners, known start dates only"
                  source={RTT_SOURCE}
                />
              </dl>
            </section>

            <section className={styles.section}>
              <h3><Icon name="calendar" size={18} />Quality</h3>
              <dl className={styles.facts}>
                <Fact
                  label="CQC overall rating"
                  value={<CqcBadge cqc={p.cqc} />}
                  formula={p.cqc.rating
                    ? `Published ${monthYear(p.cqc.date)}, ${yearsAgo(p.cqc.date)} years ago${isOlderThan2Years(p.cqc.date) ? ', older than 2 years' : ''}. Covers the whole trust, not ${specialtyName}. ${includeQuality ? 'Used in the ranking.' : 'Not used in the ranking.'}`
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
              <h3><Icon name="map-pin" size={18} />Location</h3>
              <dl className={styles.facts}>
                <Fact
                  label="Distance to trust HQ"
                  value={`${km(r.distanceKm)} km`}
                  formula={`Straight line (haversine) from the centre of ${outcode} to ${p.postcode} (${p.lat.toFixed(3)}, ${p.lng.toFixed(3)})`}
                  source={LOC_SOURCE}
                />
              </dl>
            </section>

            <section className={styles.section}>
              <h3>Missing or not comparable</h3>
              <ul className={styles.gaps}>{gaps.map((g) => <li key={g}>{g}</li>)}</ul>
            </section>
          </div>
        </>
      )}
    </dialog>
  );
}
