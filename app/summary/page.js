import Link from 'next/link';
import providers from '@/data/providers.json';
import meta from '@/data/meta.json';
import PrintButton from '@/components/PrintButton';
import BackButton from '@/components/BackButton';
import CqcBadge from '@/components/CqcBadge';
import { weeks, monthYear, isOlderThan2Years } from '@/lib/format';
import styles from './summary.module.css';

export const metadata = { title: 'Referral summary · Referral Compass' };

const CHOICE_URL = 'https://www.nhs.uk/using-the-nhs/about-the-nhs/your-choices-in-the-nhs/';
const CHOICE_SHORT = 'nhs.uk/using-the-nhs/about-the-nhs/your-choices-in-the-nhs';

// Printable, plain-language summary for the patient.
// URL carries only: provider (ODS code), specialty, km. No postcode, no name.
export default async function SummaryPage({ searchParams }) {
  const { provider: ods, specialty, km: kmParam } = await searchParams;
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
  const ratingYear = rating ? p.cqc.date.slice(0, 4) : null;

  return (
    <main className={styles.wrap}>
      <div className={styles.toolbar}>
        <BackButton />
        <PrintButton />
      </div>

      <article className={styles.card}>
        <p className={styles.kicker}>{specialtyName} referral</p>
        <h1 className={styles.lead}>Your GP has suggested asking for a referral to:</h1>
        <p className={styles.trust}>{p.name}</p>

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
                  <span className={styles.screenOnly}><CqcBadge cqc={p.cqc} /></span>
                  <span className={styles.printOnly}><strong>{rating}</strong> (rated in {ratingYear})</span>
                  {isOlderThan2Years(p.cqc.date) && (
                    <span className={styles.small}>This rating is more than 2 years old. It covers the whole trust.</span>
                  )}
                </>
              ) : (
                <>
                  <strong>No overall rating published</strong>
                  {p.cqc.wellLed && (
                    <span className={styles.small}>
                      The CQC rated how well the trust is led as {p.cqc.wellLed.rating} ({monthYear(p.cqc.wellLed.date)}).
                    </span>
                  )}
                </>
              )}
            </dd>
          </div>
          {Number.isFinite(km) && km > 0 && (
            <div className={styles.fact}>
              <dt>Distance</dt>
              <dd>
                <span className={styles.big}>About {Math.max(1, Math.round(km))} km</span>
                <span className={styles.small}>From your area to the trust’s main office. Your appointment may be at another of its hospitals.</span>
              </dd>
            </div>
          )}
        </dl>

        <h2>Why this option</h2>
        <p>
          Half of the people on this trust’s {specialtyName.toLowerCase()} waiting list have waited{' '}
          {weeks(w.medianWeeks)} weeks or less so far, and {Math.round(w.pctWithin18)} in 100 have waited under 18 weeks.
          Your GP has weighed this against the trust’s rating and how far you would need to travel.
        </p>

        <h2>You may be able to choose your provider</h2>
        <p>
          Patients may be able to choose their provider for a first outpatient appointment with an eligible
          consultant-led service. Find out more at <a href={CHOICE_URL} className={styles.url}>{CHOICE_SHORT}</a>
        </p>

        <p className={`${styles.small} ${styles.disclaimer}`}>
          This summary is not medical advice. Talk to your GP if anything changes. It is not for urgent or suspected
          cancer referrals, which follow faster routes.
        </p>

        <h2 className={styles.sourcesHead}>Sources</h2>
        <ul className={styles.sources}>
          <li>Waiting times: NHS England Referral to Treatment statistics, {meta.rttLabel} (patients still waiting).</li>
          <li>Rating: Care Quality Commission, ratings file {monthYear(meta.cqcFileDate)}{rating ? `; rating published ${monthYear(p.cqc.date)}` : ''}.</li>
          <li>Location: NHS Organisation Data Service and postcodes.io.</li>
        </ul>
        <p className={styles.footer}>
          Made with Referral Compass, an independent prototype built from public NHS data. Not an NHS service. No personal information is stored.
        </p>
      </article>
    </main>
  );
}
