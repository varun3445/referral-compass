'use client';
import { useEffect, useMemo, useState } from 'react';
import providers from '@/data/providers.json';
import meta from '@/data/meta.json';
import ConsoleInputs from '@/components/ConsoleInputs';
import ShortlistCard, { ShortlistHeader } from '@/components/ShortlistCard';
import EvidenceDrawer from '@/components/EvidenceDrawer';
import { lookupOutcode, toOutcode } from '@/lib/geo';
import { rankProviders } from '@/lib/rank';
import { count, isOlderThan2Years } from '@/lib/format';
import styles from './page.module.css';

// The summary link carries only trust, specialty and distance. No postcode.
const summaryHref = (r, specialty) =>
  `/summary?provider=${r.provider.odsCode}&specialty=${specialty}&km=${r.distanceKm.toFixed(1)}`;

export default function ReferralConsole() {
  const [inputs, setInputs] = useState({
    postcode: '', specialty: '410', maxKm: 25, priority: 'balanced', includeSpecialist: false,
  });
  const [origin, setOrigin] = useState(null);
  const [pcStatus, setPcStatus] = useState({ loading: false, error: null, resolved: null });
  const [evidenceFor, setEvidenceFor] = useState(null); // odsCode

  // Debounced lookup of the outcode only (e.g. "WC2N"), never the full postcode.
  const outcode = toOutcode(inputs.postcode);
  useEffect(() => {
    setOrigin(null);
    const typed = inputs.postcode.trim();
    if (!typed) return setPcStatus({ loading: false, error: null, resolved: null });
    if (!outcode) {
      return setPcStatus({ loading: false, error: typed.length >= 5 ? 'That doesn’t look like a UK postcode.' : null, resolved: null });
    }
    const ctrl = new AbortController();
    setPcStatus({ loading: true, error: null, resolved: null });
    const t = setTimeout(async () => {
      try {
        const loc = await lookupOutcode(outcode, ctrl.signal);
        setOrigin(loc);
        setPcStatus({ loading: false, error: null, resolved: loc.outcode });
      } catch (e) {
        if (e.name !== 'AbortError') setPcStatus({ loading: false, error: e.message, resolved: null });
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [outcode, inputs.postcode]);

  const ranking = useMemo(
    () => origin && rankProviders({ providers, origin, ...inputs }),
    [origin, inputs]
  );

  const specialtyName = meta.specialties[inputs.specialty];
  const results = ranking?.results || [];
  const evidence = results.find((r) => r.provider.odsCode === evidenceFor) || null;

  const rated = results.filter((r) => r.provider.cqc.rating);
  const oldCount = rated.filter((r) => isOlderThan2Years(r.provider.cqc.date)).length;

  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <h1>Which NHS trust could see your patient soonest?</h1>
        <p>
          Waiting times, CQC ratings and distance for {Object.keys(meta.specialties).length} specialties across{' '}
          {providers.length} London-area trusts, from NHS data for {meta.rttLabel}.{' '}
          <span className={styles.caveat}>Prototype · routine referrals only, not urgent or suspected cancer.</span>
        </p>
      </header>
      <ConsoleInputs value={inputs} onChange={setInputs} postcodeStatus={pcStatus} />

      <section className={styles.results} aria-live="polite" aria-label="Shortlist">
        {!ranking && (
          <p className={styles.prompt}>Enter the patient’s postcode to see NHS trusts ranked by wait, CQC rating and distance.</p>
        )}

        {ranking && results.length === 0 && (
          <div className={styles.empty}>
            <strong>No providers with published data within {inputs.maxKm} km.</strong> Increase distance.
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className={styles.summary}>
              <h2>
                {specialtyName}: top {results.length} of {ranking.consideredCount} trusts within {inputs.maxKm} km of {origin.outcode}
              </h2>
              <span>Ranked {inputs.priority === 'fastest' ? 'Fastest' : 'Balanced'} · NHS RTT {meta.rttLabel} · Scores are relative to the options shown here.</span>
            </div>

            {(ranking.fastestLowerRated || oldCount > 0) && (
              <div className={styles.banners}>
                {ranking.fastestLowerRated && (
                  <p className={styles.banner}>
                    <strong>Fastest option has a lower CQC rating.</strong> {results[0].provider.name} is rated {results[0].provider.cqc.rating}.
                  </p>
                )}
                {oldCount > 0 && (
                  <p className={styles.banner}>
                    {oldCount === rated.length
                      ? 'All CQC ratings shown are over 2 years old.'
                      : `${oldCount} of ${rated.length} CQC ratings shown are over 2 years old.`}{' '}
                    A trust may have improved or declined since.
                  </p>
                )}
              </div>
            )}

            <ShortlistHeader weights={ranking.weights} />
            <ol className={styles.list}>
              {results.map((r) => (
                <ShortlistCard
                  key={r.provider.odsCode}
                  result={r}
                  onEvidence={() => setEvidenceFor(r.provider.odsCode)}
                  summaryHref={summaryHref(r, inputs.specialty)}
                />
              ))}
            </ol>
          </>
        )}

        {ranking && ranking.excludedSpecialist.length > 0 && (
          <p className={styles.note}>
            Hidden, specialist or community services: {ranking.excludedSpecialist.map((s) => s.provider.name).join(', ')}. Tick
            “Include specialist and community services” to rank them.
          </p>
        )}

        {ranking && ranking.smallNumbers.length > 0 && (
          <p className={styles.note}>
            Not ranked, small numbers (fewer than {meta.minWaitingForRanking} people waiting):{' '}
            {ranking.smallNumbers.map((s) => `${s.provider.name} (${count(s.wait.totalWaiting)})`).join(', ')}.
          </p>
        )}

        {ranking && (
          <p className={styles.note}>
            Waiting times are typical figures for each NHS trust, not a single hospital site, and not an appointment date.
            Distance is a straight line from the centre of the postcode area to the trust headquarters; the clinic may be
            elsewhere. * No CQC overall rating: a neutral quality score is used.
          </p>
        )}
      </section>

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
