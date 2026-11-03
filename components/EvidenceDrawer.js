'use client';
import { useCallback, useEffect, useRef } from 'react';
import meta from '@/data/meta.json';
import CqcBadge from './CqcBadge';
import Icon from './Icon';
import { weeks, km, count, monthYear, yearsAgo, isOlderThan2Years, DISTANCE_LABEL, DISTANCE_NOTE } from '@/lib/format';
import styles from './EvidenceDrawer.module.css';

const RTT_SOURCE = { label: 'NHS England RTT, incomplete pathways', date: meta.rttLabel, href: meta.rttSourceUrl };
const CQC_SOURCE = { label: 'CQC Latest ratings file', date: monthYear(meta.cqcFileDate), href: meta.cqcSourceUrl };
const LOC_SOURCE = { label: 'NHS ODS (trust HQ postcode) and postcodes.io', date: monthYear(meta.builtAt), href: meta.odsSourceUrl };
const MATCH = { 'ods-code': 'Matched by the trust’s ODS code in the CQC file' };

const CLOSE_MS = 250;

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
        {formula && <span className={styles.detail}>{formula}</span>}
        {source && <Source s={source} />}
      </dd>
    </div>
  );
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
  const { range, consideredCount, includeQuality, nearest } = ranking || {};

  // Plain sentences, no formulas. The working is on Data and limits.
  const of = `of ${consideredCount}`;
  const waitLine = r && (w.medianWeeks <= range.minWait
    ? `Waiting so far ${weeks(w.medianWeeks)} weeks. The shortest ${of}.`
    : `Waiting so far ${weeks(w.medianWeeks)} weeks. The shortest ${of} is ${weeks(range.minWait)} weeks.`);
  const kmLine = r && (r === nearest || r.badges.nearest
    ? `${DISTANCE_LABEL} ${km(r.distanceKm)} km. Closest ${of}.`
    : `${DISTANCE_LABEL} ${km(r.distanceKm)} km. The closest ${of} is ${km(range.minKm)} km.`);
  const cqcLine = includeQuality ? 'CQC rating used in the ranking.' : 'CQC rating not used in the ranking.';

  const gaps = r ? [
    'Waiting times are for the whole trust, not one hospital or clinic.',
    'Waiting so far is how long people currently on the list have waited, not the time to an appointment.',
    !p.cqc.rating && (includeQuality
      ? `No CQC overall rating: ${p.cqc.unavailableReason}. A middle quality score is used in its place.`
      : `No CQC overall rating: ${p.cqc.unavailableReason}.`),
    p.cqc.rating && isOlderThan2Years(p.cqc.date) && `The CQC rating is ${yearsAgo(p.cqc.date)} years old. The trust may have changed since.`,
    'The CQC rating is trust wide, not for this specialty.',
    p.isSpecialist && `${p.specialistNote}. It may not accept routine referrals for every condition.`,
    'Distance to trust HQ is a straight line from the centre of the patient’s postcode area to the trust’s recorded main office. The clinic may be elsewhere.',
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
              <ul className={styles.plainList}>
                <li>{waitLine}</li>
                <li>{kmLine}</li>
                <li>{cqcLine}</li>
              </ul>
              <p className={styles.note}>
                Ranked {r.rank} of {consideredCount} trusts for these settings. How the ranking is worked out, with the full
                working, is under Data and limits.
              </p>
            </section>

            <section className={styles.section}>
              <h3>Waiting time</h3>
              <dl className={styles.facts}>
                <Fact label="Waiting so far" value={`${weeks(w.medianWeeks)} weeks`} source={RTT_SOURCE} />
                <Fact label="92nd percentile" value={`${weeks(w.p92Weeks)} weeks`} source={RTT_SOURCE} />
                <Fact label="Waiting under 18 weeks" value={`${Math.round(w.pctWithin18)}% of ${count(w.totalWaiting)} waiting`} source={RTT_SOURCE} />
              </dl>
            </section>

            <section className={styles.section}>
              <h3>Quality</h3>
              <dl className={styles.facts}>
                <Fact
                  label="CQC overall rating"
                  value={<CqcBadge cqc={p.cqc} />}
                  formula={p.cqc.rating
                    ? `Trust wide rating. ${includeQuality ? 'Used in the ranking.' : 'Not used in the ranking.'}`
                    : p.cqc.unavailableReason}
                  source={{ ...CQC_SOURCE, href: p.cqc.url || CQC_SOURCE.href, label: p.cqc.url ? 'CQC page for this trust' : CQC_SOURCE.label }}
                />
                {p.cqc.wellLed && (
                  <Fact
                    label="Well-led (trust level)"
                    value={p.cqc.wellLed.rating}
                    formula={`Published ${monthYear(p.cqc.wellLed.date)}. About leadership, not an overall rating, so not used in the ranking.`}
                    source={CQC_SOURCE}
                  />
                )}
                <Fact label="How the CQC match was made" value={MATCH[p.cqc.matchMethod] || p.cqc.matchMethod || 'Not matched'} />
              </dl>
            </section>

            <section className={styles.section}>
              <h3>Location</h3>
              <dl className={styles.facts}>
                <Fact label={DISTANCE_LABEL} value={`${km(r.distanceKm)} km`} formula={DISTANCE_NOTE} source={LOC_SOURCE} />
                <Fact
                  label="Where the location came from"
                  value={`ODS main office postcode ${p.postcode}`}
                  formula={`Patient side: the centre of ${outcode} via postcodes.io. Only the outcode is sent.`}
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
