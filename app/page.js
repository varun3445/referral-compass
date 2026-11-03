'use client';
import { useEffect, useMemo, useState } from 'react';
import providers from '@/data/providers.json';
import meta from '@/data/meta.json';
import ConsoleInputs from '@/components/ConsoleInputs';
import ShortlistCard from '@/components/ShortlistCard';
import { lookupPostcode } from '@/lib/geo';
import { rankProviders } from '@/lib/rank';
import { count } from '@/lib/format';
import styles from './page.module.css';

const POSTCODE_SHAPE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export default function ReferralConsole() {
  const [inputs, setInputs] = useState({ postcode: '', specialty: '410', maxKm: 25, priority: 'balanced' });
  const [origin, setOrigin] = useState(null);
  const [pcStatus, setPcStatus] = useState({ loading: false, error: null, resolved: null });

  // Debounced postcode lookup. Only checks once the postcode looks complete.
  useEffect(() => {
    const pc = inputs.postcode.trim();
    setOrigin(null);
    if (!pc) return setPcStatus({ loading: false, error: null, resolved: null });
    if (!POSTCODE_SHAPE.test(pc)) {
      return setPcStatus({ loading: false, error: pc.length >= 5 ? 'That doesn’t look like a full UK postcode.' : null, resolved: null });
    }
    const ctrl = new AbortController();
    setPcStatus({ loading: true, error: null, resolved: null });
    const t = setTimeout(async () => {
      try {
        const loc = await lookupPostcode(pc, ctrl.signal);
        setOrigin(loc);
        setPcStatus({ loading: false, error: null, resolved: loc.postcode });
      } catch (e) {
        if (e.name !== 'AbortError') setPcStatus({ loading: false, error: e.message, resolved: null });
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [inputs.postcode]);

  const ranking = useMemo(
    () => origin && rankProviders({ providers, origin, specialty: inputs.specialty, maxKm: inputs.maxKm, priority: inputs.priority }),
    [origin, inputs.specialty, inputs.maxKm, inputs.priority]
  );

  const specialtyName = meta.specialties[inputs.specialty];

  return (
    <main className={styles.main}>
      <ConsoleInputs value={inputs} onChange={setInputs} postcodeStatus={pcStatus} />

      <section className={styles.results} aria-live="polite" aria-label="Shortlist">
        {!ranking && (
          <p className={styles.prompt}>Enter the patient’s postcode to see NHS trusts ranked by wait, CQC rating and distance.</p>
        )}

        {ranking && ranking.results.length === 0 && (
          <div className={styles.empty}>
            <strong>No providers with published data within {inputs.maxKm} km.</strong> Increase distance.
          </div>
        )}

        {ranking && ranking.results.length > 0 && (
          <>
            <div className={styles.summary}>
              <h2>
                {specialtyName}: top {ranking.results.length} of {ranking.consideredCount} trusts within {inputs.maxKm} km
              </h2>
              <span>
                Ranked {inputs.priority === 'fastest' ? 'Fastest' : 'Balanced'} · NHS RTT {meta.rttLabel}
              </span>
            </div>
            <ol className={styles.list}>
              {ranking.results.map((r) => <ShortlistCard key={r.provider.odsCode} result={r} />)}
            </ol>
          </>
        )}

        {ranking && ranking.smallNumbers.length > 0 && (
          <p className={styles.note}>
            Not ranked, small numbers (fewer than {meta.minWaitingForRanking} people waiting):{' '}
            {ranking.smallNumbers.map((s) => `${s.provider.name} (${count(s.wait.totalWaiting)})`).join(', ')}.
          </p>
        )}

        {ranking && (
          <p className={styles.note}>
            Waiting times are typical figures for each NHS <strong>trust</strong>, not a single hospital site, and
            not an appointment date. Distance is a straight line to the trust headquarters; the clinic may be elsewhere.
            * No CQC overall rating: a neutral quality score is used.
          </p>
        )}
      </section>
    </main>
  );
}
