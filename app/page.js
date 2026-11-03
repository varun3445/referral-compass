'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import providers from '@/data/providers.json';
import meta from '@/data/meta.json';
import ConsoleInputs from '@/components/ConsoleInputs';
import HeroResult from '@/components/HeroResult';
import OptionRow from '@/components/OptionRow';
import EvidenceDrawer from '@/components/EvidenceDrawer';
import Icon from '@/components/Icon';
import DataButton from '@/components/DataButton';
import { lookupOutcode, toOutcode, distanceKm } from '@/lib/geo';
import { DISTANCES, DEFAULT_INPUTS, session, RESET_EVENT } from '@/lib/nav';
import { rankProviders } from '@/lib/rank';
import { ratingAgeRange } from '@/lib/explain';
import { count, isOlderThan2Years } from '@/lib/format';
import styles from './page.module.css';

// CQC rating ages, worked out from the data (same source as the checkbox label).
const AGE = ratingAgeRange(providers);

// The summary link carries trust codes, specialty and distances only. No postcode.
// compare: the next two results as ODS:km pairs, for the comparison table.
const summaryHref = (r, others, specialty) => {
  const compare = others.slice(0, 2).map((o) => `${o.provider.odsCode}:${o.distanceKm.toFixed(1)}`).join(',');
  return `/summary?provider=${r.provider.odsCode}&specialty=${specialty}&km=${r.distanceKm.toFixed(1)}${compare ? `&compare=${compare}` : ''}`;
};

export default function ReferralConsole() {
  const [inputs, setInputs] = useState(session.inputs);
  const [origin, setOrigin] = useState(session.origin);
  const [collapsed, setCollapsed] = useState(session.collapsed);
  const [pcStatus, setPcStatus] = useState({ loading: false, error: null, kind: null, resolved: session.origin?.outcode || null });
  const [evidenceFor, setEvidenceFor] = useState(null); // odsCode
  const resultsRef = useRef(null);
  const runExample = useRef(false); // fold the inputs once the example resolves

  useEffect(() => { Object.assign(session, { inputs, origin, collapsed }); }, [inputs, origin, collapsed]);

  // "New search" in the header clears everything back to the defaults.
  useEffect(() => {
    const reset = () => {
      setInputs(DEFAULT_INPUTS); setOrigin(null); setCollapsed(false); setEvidenceFor(null);
      setPcStatus({ loading: false, error: null, kind: null, resolved: null });
    };
    window.addEventListener(RESET_EVENT, reset);
    return () => window.removeEventListener(RESET_EVENT, reset);
  }, []);

  // Debounced lookup of the outcode only (e.g. "WC2N"), never the full postcode.
  const outcode = toOutcode(inputs.postcode);
  useEffect(() => {
    const typed = inputs.postcode.trim();
    if (!typed) { setOrigin(null); return setPcStatus({ loading: false, error: null, kind: null, resolved: null }); }
    if (!outcode) {
      setOrigin(null);
      const looksDone = typed.replace(/\s/g, '').length >= 5;
      return setPcStatus({
        loading: false, kind: looksDone ? 'invalid' : null, resolved: null,
        error: looksDone ? 'Enter a postcode like WC2N 5DU, or just the first part, WC2N.' : null,
      });
    }
    if (origin?.outcode === outcode) return setPcStatus({ loading: false, error: null, kind: null, resolved: outcode });
    const ctrl = new AbortController();
    setPcStatus({ loading: true, error: null, kind: null, resolved: null });
    const t = setTimeout(async () => {
      try {
        const loc = await lookupOutcode(outcode, ctrl.signal);
        setOrigin(loc);
        setPcStatus({ loading: false, error: null, kind: null, resolved: loc.outcode });
        if (runExample.current) {
          runExample.current = false;
          setCollapsed(true);
          setTimeout(() => resultsRef.current?.focus(), 0);
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        setOrigin(null);
        setPcStatus({ loading: false, error: e.message, kind: e.kind || 'unavailable', resolved: null });
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcode, inputs.postcode]);

  const ranking = useMemo(
    () => origin && rankProviders({ providers, origin, ...inputs, limit: Infinity }),
    [origin, inputs]
  );

  // Every trust in the search (for the charts); the list shows the top 5.
  const pool = ranking?.results || [];
  const results = pool.slice(0, 5);
  const [top, ...others] = results;
  // Wait bars are scaled to the longest wait among the results shown.
  const maxWait = results.length ? Math.max(...results.map((r) => r.wait.medianWeeks)) : 0;
  const evidence = results.find((r) => r.provider.odsCode === evidenceFor) || null;
  const specialtyName = meta.specialties[inputs.specialty];

  const rated = results.filter((r) => r.provider.cqc.rating);
  const oldCount = rated.filter((r) => isOlderThan2Years(r.provider.cqc.date)).length;
  const nextDistance = DISTANCES.find((d) => d > inputs.maxKm);

  // Collapse the inputs into a one-line bar (tablet and phone only, via CSS).
  function showResults() {
    if (!origin) return;
    setCollapsed(true);
    setTimeout(() => resultsRef.current?.focus(), 0);
  }
  // "Try an example": fill the form with WC2N + Rheumatology and run it.
  function tryExample() {
    runExample.current = true;
    setInputs({ ...inputs, postcode: 'WC2N', specialty: '410' });
  }
  function editSearch() {
    setCollapsed(false);
    setTimeout(() => document.getElementById('postcode')?.focus(), 0);
  }

  const resultKey = `${origin?.outcode}|${inputs.specialty}|${inputs.maxKm}|${inputs.priority}|${inputs.includeSpecialist}|${inputs.includeQuality}`;

  return (
    <main className={styles.main}>
      <header className={`${styles.head} ${collapsed && origin ? styles.headCompact : ''}`}>
        <h1>Compare trusts for this referral</h1>
        <p>Waiting so far, ratings and distance for {providers.length} London area trusts. Routine referrals only.</p>
        <DataButton placement="page" className={styles.headData} />
      </header>

      <div className={styles.layout}>
        {collapsed && origin && (
          <div className={styles.summaryBar}>
            <p>
              <strong>{origin.outcode}</strong> · {specialtyName} · {inputs.maxKm} km{inputs.includeQuality ? ' · CQC on' : ''}
            </p>
            <button type="button" className={styles.edit} onClick={editSearch}>
              Edit<span className="visually-hidden"> search</span>
            </button>
          </div>
        )}

        <aside className={`${styles.panel} ${collapsed && origin ? styles.panelCollapsed : ''}`}>
          <ConsoleInputs
            value={inputs}
            onChange={setInputs}
            postcodeStatus={pcStatus}
            onSubmit={showResults}
            canSubmit={Boolean(origin)}
          />
        </aside>

        <section
          className={`${styles.results} ${top ? '' : styles.resultsFill}`}
          aria-labelledby="results-heading"
          ref={resultsRef}
          tabIndex={-1}
        >
          <h2 id="results-heading" className="visually-hidden">Results</h2>

          <p className={top ? styles.count : 'visually-hidden'} aria-live="polite">
            {ranking && results.length > 0 &&
              `${ranking.consideredCount} trust${ranking.consideredCount === 1 ? '' : 's'} with ${specialtyName} data within ${inputs.maxKm} km of ${origin.outcode} · NHS data ${meta.rttLabel}`}
          </p>

          <ResultState
            pcStatus={pcStatus}
            ranking={ranking}
            inputs={inputs}
            origin={origin}
            nextDistance={nextDistance}
            onWiden={(d) => setInputs({ ...inputs, maxKm: d })}
            onExample={tryExample}
          />

          {top && (
            <div key={resultKey} className={styles.fade}>
              {oldCount > 0 && (
                <p className={`callout ${styles.banner}`}>
                  <Icon name="triangle-alert" size={18} />
                  <span>
                    CQC ratings are {AGE.min} to {AGE.max} years old and{' '}
                    {inputs.includeQuality ? 'are used in the ranking.' : 'not used in the ranking.'}
                  </span>
                </p>
              )}

              {ranking.fastestLowerRated && (
                <p className={`inset ${styles.note}`}>
                  <Icon name="triangle-alert" size={20} />
                  <span>The shortest wait option has a lower CQC rating: {top.provider.cqc.rating}.</span>
                </p>
              )}

              <HeroResult
                result={top}
                ranking={ranking}
                maxWait={maxWait}
                maxKm={inputs.maxKm}
                summaryHref={summaryHref(top, others, inputs.specialty)}
                onEvidence={() => setEvidenceFor(top.provider.odsCode)}
              />

              {others.length > 0 && (
                <div className={styles.others}>
                  <h2 className={styles.othersHead}>Other options</h2>
                  <ul className={styles.rows}>
                    {others.slice(0, 4).map((r) => (
                      <OptionRow key={r.provider.odsCode} result={r} maxWait={maxWait} onEvidence={() => setEvidenceFor(r.provider.odsCode)} />
                    ))}
                  </ul>
                </div>
              )}

              {ranking.excludedSpecialist.length > 0 && (
                <p className={`inset ${styles.quiet}`}>
                  Some specialist and community trusts are hidden because they may not offer routine referrals for
                  this specialty. Turn them on under More options to see them.
                </p>
              )}
              {ranking.smallNumbers.length > 0 && (
                <p className={`inset ${styles.quiet}`}>
                  Not compared because fewer than {meta.minWaitingForRanking} people are waiting:{' '}
                  {ranking.smallNumbers.map((s) => `${s.provider.name} (${count(s.wait.totalWaiting)})`).join(', ')}.
                </p>
              )}

              <p className={styles.footnote}>
                Waiting times are for each NHS trust, not a single hospital, and are not an appointment date.
                Distance to trust HQ is a straight line to the trust’s recorded main office.
              </p>
            </div>
          )}
        </section>
      </div>

      <EvidenceDrawer
        result={evidence}
        ranking={ranking}
        outcode={origin?.outcode}
        specialtyName={specialtyName}
        onClose={() => setEvidenceFor(null)}
      />
    </main>
  );
}

// One friendly sentence for every state that is not a list of results.
function ResultState({ pcStatus, ranking, inputs, origin, nextDistance, onWiden, onExample }) {
  let text = null;
  let action = null;
  let note = null;

  if (pcStatus.loading) text = 'Finding trusts near this postcode…';
  else if (pcStatus.error) text = pcStatus.error;
  else if (!inputs.postcode.trim()) {
    text = 'Enter the patient’s postcode to compare trusts for this referral.';
    action = (
      <button type="button" className="btn btn-primary" onClick={onExample}>
        Try an example: WC2N, Rheumatology
      </button>
    );
    note = 'For each trust you will see waiting so far, CQC rating and distance.';
  }
  else if (!origin) text = 'Keep typing the postcode. Results appear as soon as we recognise it.';
  else if (ranking && ranking.results.length === 0) {
    // Outside the area the data covers: no point suggesting a larger distance.
    if (distanceKm(origin, meta.center) > meta.radiusKm) {
      text = 'This postcode is outside the London area covered by this prototype.';
    } else {
      const name = meta.specialties[inputs.specialty];
      text = `No trusts with ${name} data within ${inputs.maxKm} km.${nextDistance ? ' Try a larger distance.' : ''} This prototype covers London area trusts only.`;
      if (nextDistance) action = (
        <button type="button" className="btn btn-secondary" onClick={() => onWiden(nextDistance)}>
          Search within {nextDistance} km
        </button>
      );
    }
  }
  if (!text) return null;

  const tone = pcStatus.error ? styles.stateError : '';
  return (
    <div className={`${styles.state} ${tone} ${note ? styles.stateEmpty : ''}`}>
      <div className={styles.stateInner}>
        <p>{text}</p>
        {action}
        {note && <p className={styles.stateNote}>{note}</p>}
      </div>
    </div>
  );
}
