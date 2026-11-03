import Link from 'next/link';
import providers from '@/data/providers.json';
import meta from '@/data/meta.json';
import PrintButton from '@/components/PrintButton';
import BackButton from '@/components/BackButton';
import { weeks, km as fmtKm, monthYear, trustName } from '@/lib/format';
import FromArea from '@/components/FromArea';
import styles from './summary.module.css';

export const metadata = { title: 'Referral summary · Referral Compass' };

const CHOICE_URL = 'https://www.nhs.uk/using-the-nhs/about-the-nhs/your-choices-in-the-nhs/';
const CHOICE_SHORT = 'nhs.uk/using-the-nhs/about-the-nhs/your-choices-in-the-nhs';

// Printable, plain-language summary for the patient.
// URL carries only: provider (ODS code), specialty, km, and compare (ODS:km
// pairs for the next results). No postcode, no name.
export default async function SummaryPage({ searchParams }) {
  const { provider: ods, specialty, km: kmParam, compare = '' } = await searchParams;
  const p = providers.find((x) => x.odsCode === ods);
  const w = p?.specialties[specialty];
  const km = Number(kmParam);

  if (!p || !w) {
    return (
      <main className={styles.wrap}>
        <div className={styles.card}>
          <h1>Summary not available</h1>
          <p>This link is missing a trust or specialty. <Link href="/">Start a new search</Link>.</p>
        </div>
      </main>
    );
  }

  const specialtyName = meta.specialties[specialty];
  const rating = p.cqc.rating;
  // Comparison rows: the selected trust, then the next results as passed in the URL.
  const rows = [{ p, w, km, selected: true }].concat(
    String(compare).split(',').filter(Boolean).slice(0, 2).map((pair) => {
      const [code, k] = pair.split(':');
      const q = providers.find((x) => x.odsCode === code);
      const qw = q?.specialties[specialty];
      return q && qw && !qw.smallNumbers ? { p: q, w: qw, km: Number(k) } : null;
    }).filter(Boolean)
  );

  return (
    <main className={styles.wrap}>
      <div className={styles.toolbar}>
        <BackButton />
        <PrintButton />
      </div>

      <article className={styles.card}>
        <div className={styles.titleBlock}>
          <p className={styles.kicker}>{specialtyName} referral</p>
          <h1 className={styles.lead}>Provider option to discuss with your GP</h1>
          <p className={styles.trust}>{p.name}</p>
        </div>

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Waiting so far</dt>
            <dd>
              <span className={styles.big}>About {Math.round(w.medianWeeks)} weeks</span>
              <span className={styles.small}>
                Half of the people on this list have waited this long or less (NHS data, {meta.rttLabel}).
                This is not a booking date.
              </span>
            </dd>
          </div>
          <div className={styles.fact}>
            <dt>Care Quality Commission rating</dt>
            <dd>
              {rating ? (
                <>
                  <span className={styles.rating}>{rating}</span>
                  <span className={styles.small}>Published {monthYear(p.cqc.date)} · Trust wide rating</span>
                </>
              ) : (
                <>
                  <span className={styles.rating}>Not available</span>
                  <span className={styles.small}>{p.cqc.unavailableReason}</span>
                </>
              )}
            </dd>
          </div>
          {Number.isFinite(km) && km > 0 && (
            <div className={styles.fact}>
              <dt>Distance from <FromArea /></dt>
              <dd>
                <span className={styles.big}>About {Math.max(1, Math.round(km))} km from <FromArea /></span>
                <span className={styles.small}>Straight line from <FromArea /> to the trust’s recorded main office. Your appointment may be at another hospital or clinic.</span>
              </dd>
            </div>
          )}
        </dl>

        {rows.length > 1 && (
          <section className={styles.section} aria-labelledby="compare-head">
            <h2 id="compare-head">How it compares</h2>
            <table className={styles.compare}>
              <thead>
                <tr><th scope="col">Trust</th><th scope="col">Waiting so far</th><th scope="col">Distance from <FromArea /></th></tr>
              </thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.p.odsCode} className={x.selected ? styles.selected : ''}>
                    <th scope="row">{trustName(x.p.name)}{x.selected && <span className={styles.this}> (this option)</span>}</th>
                    <td>{weeks(x.w.medianWeeks)} weeks</td>
                    <td>{Number.isFinite(x.km) ? `${fmtKm(x.km)} km` : 'Not available'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.small}>Trust level data. Waiting so far is not an appointment date.</p>
          </section>
        )}

        <section className={styles.section}>
        <h2>About this option</h2>
        <p>
          Half of the people on this trust’s {specialtyName.toLowerCase()} waiting list have waited{' '}
          {weeks(w.medianWeeks)} weeks or less so far, and {Math.round(w.pctWithin18)} in 100 have waited under 18 weeks.
          It came top for the search settings your GP used, which compare waiting so far and distance from <FromArea />.
        </p>
        </section>

        <section className={`${styles.section} ${styles.notes}`} aria-labelledby="notes-head">
          <h2 id="notes-head">Patient preferences and travel notes <span className={styles.optional}>(optional)</span></h2>
          <div className={styles.ruled} aria-hidden="true">
            <span /><span /><span /><span />
          </div>
        </section>

        <section className={styles.section}>
        <h2>You may be able to choose your provider</h2>
        <p>
          Patients may be able to choose their provider for a first outpatient appointment with an eligible
          consultant-led service. Find out more at <a href={CHOICE_URL} className={styles.url}>{CHOICE_SHORT}</a>
        </p>

        </section>

        <p className={`${styles.small} ${styles.disclaimer}`}>
          This summary is not medical advice. Talk to your GP if anything changes. It is not for urgent or suspected
          cancer referrals, which follow faster routes.
        </p>

        <section className={styles.section}>
        <h2 className={styles.sourcesHead}>Sources</h2>
        <ul className={styles.sources}>
          <li>Waiting times: NHS England Referral to Treatment statistics, {meta.rttLabel} (patients still waiting).</li>
          <li>Rating: Care Quality Commission, ratings file {monthYear(meta.cqcFileDate)}{rating ? `; rating published ${monthYear(p.cqc.date)}` : ''}.</li>
          <li>Location: NHS Organisation Data Service and postcodes.io.</li>
        </ul>
        </section>
        <p className={styles.footer}>
          Made with Referral Compass, an independent prototype built from public NHS data. Not an NHS service. No personal information is stored.
        </p>
      </article>
    </main>
  );
}
