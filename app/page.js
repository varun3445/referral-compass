'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import providers from '@/data/providers.json';
import meta from '@/data/meta.json';
import ConsoleInputs, { DISTANCES } from '@/components/ConsoleInputs';
import HeroResult from '@/components/HeroResult';
import OptionRow from '@/components/OptionRow';
import EvidenceDrawer from '@/components/EvidenceDrawer';
import Icon from '@/components/Icon';
import { lookupOutcode, toOutcode } from '@/lib/geo';
import { rankProviders } from '@/lib/rank';
import { count, isOlderThan2Years } from '@/lib/format';
import styles from './page.module.css';

// The summary link carries only trust, specialty and distance. No postcode.
const summaryHref = (r, specialty) =>
  `/summary?provider=${r.provider.odsCode}&specialty=${specialty}&km=${r.distanceKm.toFixed(1)}`;

// Kept in memory only (never written to storage), so "Back" from the
// summary returns to the same search within this tab.
let memory = {
  inputs: { postcode: '', specialty: '410', maxKm: 25, priority: 'balanced', includeSpecialist: false, includeQuality: false },
  origin: null,
  collapsed: false,
};

export default function ReferralConsole() {
  const [inputs, setInputs] = useState(memory.inputs);
  const [origin, setOrigin] = useState(memory.origin);
  const [collapsed, setCollapsed] = useState(memory.collapsed);
  const [pcStatus, setPcStatus] = useState({ loading: false, error: null, kind: null, resolved: memory.origin?.outcode || null });
  const [evidenceFor, setEvidenceFor] = useState(null); // odsCode
  const resultsRef = useRef(null);

  useEffect(() => { memory = { inputs, origin, collapsed }; }, [inputs, origin, collapsed]);

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
    () => origin && rankProviders({ providers, origin, ...inputs }),
    [origin, inputs]
  );

  const results = ranking?.results || [];
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
      </header>

      <div className={styles.layout}>
        {collapsed && origin && (
          <div className={styles.summaryBar}>
            <p>
              <strong>{origin.outcode}</strong> · {specialtyName} · {inputs.maxKm} km{inputs.includeQuality ? ' · CQC on' : ''}
            </p>
            <button type="button" className={styles.edit} onClick={editSearch}>
              <Icon name="pencil" size={18} /> Edit<span className="visually-hidden"> search</span>
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

        <section className={styles.results} aria-labelledby="results-heading" ref={resultsRef} tabIndex={-1}>
          <h2 id="results-heading" className="visually-hidden">Results</h2>

          <p className={styles.count} aria-live="polite">
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
          />

          {top && (
            <div key={resultKey} className={styles.fade}>
              {oldCount > 0 && (
                <p className={`callout ${styles.banner}`}>
                  <Icon name="triangle-alert" size={18} />
                  <span className={styles.bannerText}>
                  <strong>Important</strong>{' '}
                  <span className={styles.bannerFull}>
                    {oldCount === rated.length
                      ? 'All CQC ratings shown are over 2 years old.'
                      : `${oldCount} of ${rated.length} CQC ratings shown are over 2 years old.`}
                    {' '}A trust may have improved or declined since.
                  </span>
                  <span className={styles.bannerShort}>
                    {oldCount === rated.length ? 'All CQC ratings are over 2 years old.' : `${oldCount} of ${rated.length} ratings are over 2 years old.`}
                  </span>
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
                summaryHref={summaryHref(top, inputs.specialty)}
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
                  Specialist and community services are hidden: {ranking.excludedSpecialist.map((s) => s.provider.name).join(', ')}.
                  Turn them on under More options.
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
                Distance is a straight line to the trust’s main office.
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
function ResultState({ pcStatus, ranking, inputs, origin, nextDistance, onWiden }) {
  let text = null;
  let action = null;

  if (pcStatus.loading) text = 'Finding trusts near this postcode…';
  else if (pcStatus.error) text = pcStatus.error;
  else if (!inputs.postcode.trim()) text = 'Enter the patient’s postcode to compare trusts for this referral.';
  else if (!origin) text = 'Keep typing the postcode. Results appear as soon as we recognise it.';
  else if (ranking && ranking.results.length === 0) {
    const anywhere = rankProviders({ providers, origin, ...inputs, maxKm: 80 }).consideredCount > 0;
    if (!anywhere) {
      text = `There are no trusts in this prototype near ${origin.outcode}. It only covers trusts within ${meta.radiusKm} km of central London.`;
    } else {
      text = `No trusts with published data within ${inputs.maxKm} km of ${origin.outcode}.`;
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
    <div className={`${styles.state} ${tone}`}>
      <p>{text}</p>
      {action}
    </div>
  );
}
