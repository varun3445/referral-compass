import Link from 'next/link';
import providers from '@/data/providers.json';
import meta from '@/data/meta.json';
import { WEIGHTS, WEIGHTS_WITH_QUALITY, QUALITY_SCORE, UNRATED_QUALITY_SCORE, CLOSE_CALL } from '@/lib/rank';
import { ratingAgeRange } from '@/lib/explain';
import { monthYear, isOlderThan2Years } from '@/lib/format';
import styles from './data.module.css';

export const metadata = { title: 'Data and limits · Referral Compass' };

// Facts about this build, worked out from the data so the page never drifts.
const rated = providers.filter((p) => p.cqc.rating);
const ratingDates = rated.map((p) => p.cqc.date).sort();
const STATS = {
  trusts: providers.length,
  rated: rated.length,
  allRatingsOld: rated.every((p) => isOlderThan2Years(p.cqc.date)),
  oldest: monthYear(ratingDates[0]),
  newest: monthYear(ratingDates.at(-1)),
  wellLedOnly: providers.filter((p) => !p.cqc.rating && p.cqc.wellLed).length,
  specialist: providers.filter((p) => p.isSpecialist).map((p) => p.name),
  smallPairs: providers.flatMap((p) => Object.values(p.specialties)).filter((s) => s.smallNumbers).length,
};

const AGE = ratingAgeRange(providers);
const PRIORITY_LABEL = { fastest: 'Shortest wait', balanced: 'Balanced' };

const OGL = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/';

const SOURCES = [
  {
    name: 'Waiting times',
    publisher: 'NHS England, Referral to Treatment (RTT) waiting times, full CSV extract',
    href: meta.rttSourceUrl,
    date: `${meta.rttLabel} data (published Oct 2026)`,
    used: 'Patients still waiting ("incomplete pathways"), by trust and specialty, in weekly groups.',
    licence: 'Open Government Licence v3.0',
  },
  {
    name: 'Quality ratings',
    publisher: 'Care Quality Commission, Latest ratings file (Providers sheet)',
    href: meta.cqcSourceUrl,
    date: `File dated ${monthYear(meta.cqcFileDate)}, downloaded ${monthYear(meta.cqcDownloaded)}`,
    used: 'Trust-level overall rating and its publication date. Matched to trusts by ODS code.',
    licence: 'Open Government Licence v3.0',
  },
  {
    name: 'Trust headquarters',
    publisher: 'NHS Organisation Data Service (ODS) API',
    href: 'https://digital.nhs.uk/services/organisation-data-service',
    date: `Looked up ${monthYear(meta.builtAt)}`,
    used: 'Registered postcode of each trust.',
    licence: 'Open Government Licence v3.0',
  },
  {
    name: 'Locations',
    publisher: 'postcodes.io (ONS Postcode Directory)',
    href: 'https://postcodes.io',
    date: `Trust postcodes ${monthYear(meta.builtAt)}; patient area looked up live`,
    used: 'Latitude and longitude for trust postcodes and for the centre of the patient’s postcode area.',
    licence: 'Contains OS data © Crown copyright and database right. Contains Royal Mail data © Royal Mail copyright and database right. Contains National Statistics data © Crown copyright and database right.',
  },
];

const LIMITS = [
  ['Trust, not hospital site', 'NHS England publishes waiting times per trust. A trust may run several hospitals with different waits.'],
  ['“Waiting so far”, not time to appointment', 'The median is how long people currently on the list have waited so far. It is not a prediction of when a new patient will be seen.'],
  ['Distance is approximate', 'A straight line from the centre of the patient’s postcode area (e.g. WC2N) to the trust’s registered headquarters. The clinic may be at another site, and travel time is not measured.'],
  ['CQC ratings are trust-wide and old', `A rating covers the whole trust, not the specialty. ${STATS.allRatingsOld ? 'Every' : 'Most'} overall rating in this data set is over 2 years old: they are ${AGE.min} to ${AGE.max} years old (oldest ${STATS.oldest}, newest ${STATS.newest}). Because of this, CQC ratings are shown as context but are not used in the ranking unless the GP ticks “Include CQC rating in the ranking”.`],
  ['Well-led-only trusts', `${STATS.wellLedOnly} trusts have only a trust-level Well-led rating from CQC’s newer approach, with no overall rating. They show “Rating unavailable” plus a “Well-led only” chip, and, only when CQC is included in the ranking, are given a neutral quality score of ${UNRATED_QUALITY_SCORE}. Well-led is never used as a stand-in for the overall rating.`],
  ['Small numbers', `Trust and specialty pairs with fewer than ${meta.minWaitingForRanking} people waiting are not ranked (a median from a handful of patients is noise). They are listed under the shortlist. There are ${STATS.smallPairs} such pairs.`],
  ['Specialist and community services', `${STATS.specialist.length} trusts are tagged as specialist or community services (${STATS.specialist.join(', ')}). They are hidden from the ranking unless the GP ticks “Include specialist and community services”, and keep their tag when shown.`],
  ['London area only', `Only the ${STATS.trusts} NHS trusts within ${meta.radiusKm} km of central London are included, to keep the data reviewable. Independent sector providers are not included.`],
  ['Five specialties', `${Object.values(meta.specialties).join(', ')}. Pain Management is left out because NHS England does not publish it as its own specialty; it is grouped into “Other” categories that mix several services.`],
  ['Not for urgent referrals', 'Urgent and suspected cancer referrals follow faster pathways. This tool is for routine outpatient referrals only.'],
];

export default function DataPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
      <header className={styles.intro}>
        <h1>Data and limits</h1>
        <p>
          Referral Compass is an independent prototype, not an NHS service. Every number comes from public NHS data and is shown with its source and date.
          This page explains where the data comes from, how each number is worked out, and what it cannot tell you.
        </p>
        <nav aria-label="On this page" className={styles.toc}>
          <a href="#sources">Sources</a>
          <a href="#calculations">How numbers are calculated</a>
          <a href="#ranking">Ranking</a>
          <a href="#limits">Known limits</a>
          <a href="#privacy">Privacy</a>
          <a href="#licence">Licence</a>
        </nav>
      </header>

      <section id="sources" className={styles.section}>
        <h2>Sources</h2>
        <div className={styles.tableWrap} role="region" aria-label="Sources table, scrolls sideways on small screens" tabIndex={0}>
          <table className={styles.table}>
            <thead>
              <tr><th scope="col">Data</th><th scope="col">Source</th><th scope="col">Date</th><th scope="col">What we use</th></tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr key={s.name}>
                  <th scope="row">{s.name}</th>
                  <td><a href={s.href} target="_blank" rel="noopener">{s.publisher}</a></td>
                  <td>{s.date}</td>
                  <td>{s.used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="calculations" className={styles.section}>
        <h2>How each number is calculated</h2>
        <dl className={styles.defs}>
          <div>
            <dt>People waiting</dt>
            <dd>Sum of NHS England’s weekly groups (0 to 1 weeks, up to 104+ weeks) across all commissioners, for one trust and specialty. People with an unknown start date are left out because they cannot be placed in a week.</dd>
          </div>
          <div>
            <dt>Median wait so far</dt>
            <dd>
              The point where half of the people waiting have waited less. Found in the weekly groups, then placed inside its week in proportion:
              <code>week + (target − people in earlier weeks) ÷ people in that week</code>, where target = people waiting × 0.5.
              A result in the open-ended 104+ week group is shown as 104.
            </dd>
          </div>
          <div>
            <dt>92nd percentile</dt>
            <dd>The same method with target = people waiting × 0.92. This is the measure behind the NHS 18-week standard.</dd>
          </div>
          <div>
            <dt>% within 18 weeks</dt>
            <dd><code>people in weeks 0 to 18 ÷ people waiting × 100</code></dd>
          </div>
          <div>
            <dt>Distance</dt>
            <dd>Haversine (great-circle) distance in km from the centre of the patient’s postcode area to the trust’s registered postcode.</dd>
          </div>
          <div>
            <dt>CQC rating age</dt>
            <dd>Taken from the rating’s publication date in the CQC file. Ratings published more than 2 years ago are flagged.</dd>
          </div>
        </dl>
        <p className={styles.aside}>
          The Evidence panel on each result shows this working with the real numbers for that trust. The full pipeline is
          in <a href="https://github.com/varun3445/referral-compass/blob/main/scripts/build-data.mjs">scripts/build-data.mjs</a>.
        </p>
      </section>

      <section id="ranking" className={styles.section}>
        <h2>Ranking</h2>
        <p>
          Trusts with data for the chosen specialty within the chosen distance are scored from 0 to 1. By default the
          ranking uses <strong>waiting time and distance only</strong>. CQC ratings are {AGE.min} to {AGE.max} years
          old, so they are shown next to each trust but do not change the order unless the GP ticks “Include CQC
          rating in the ranking” under More options. Scores are relative to the trusts in that search: the best gets 1,
          the worst gets 0.
        </p>
        <ul className={styles.list}>
          <li><strong>Wait:</strong> <code>(longest median − this median) ÷ (longest − shortest)</code></li>
          <li>
            <strong>Quality (only when CQC is included):</strong>{' '}
            {Object.entries(QUALITY_SCORE).map(([k, v]) => `${k} ${v}`).join(' · ')} · no overall rating {UNRATED_QUALITY_SCORE} (flagged)
          </li>
          <li><strong>Distance:</strong> <code>(furthest − this) ÷ (furthest − nearest)</code></li>
        </ul>
        <div className={styles.tableWrap} role="region" aria-label="Ranking weights table, scrolls sideways on small screens" tabIndex={0}>
          <table className={`${styles.table} ${styles.weights}`}>
            <caption className="visually-hidden">Ranking weights by priority and CQC setting</caption>
            <thead>
              <tr><th scope="col">Priority</th><th scope="col">CQC in ranking</th><th scope="col">Wait</th><th scope="col">Quality</th><th scope="col">Distance</th></tr>
            </thead>
            <tbody>
              {[[WEIGHTS, 'No (default)'], [WEIGHTS_WITH_QUALITY, 'Yes']].flatMap(([set, label]) =>
                Object.entries(set).map(([k, w]) => (
                  <tr key={`${k}-${label}`}>
                    <th scope="row">{PRIORITY_LABEL[k]}</th>
                    <td>{label}</td><td>{w.wait}</td><td>{w.quality}</td><td>{w.distance}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p>
          Overall score = wait × weight + distance × weight (+ quality × weight when CQC is included). The top 5 are shown. If the top two are
          within {CLOSE_CALL} of each other, both are labelled “Close call”. Each result also has a plain-language
          trade-off against the nearest trust.
        </p>
      </section>

      <section id="limits" className={styles.section}>
        <h2>Known limits</h2>
        <dl className={styles.defs}>
          {LIMITS.map(([t, d]) => (
            <div key={t}><dt>{t}</dt><dd>{d}</dd></div>
          ))}
        </dl>
      </section>

      <section id="privacy" className={styles.section}>
        <h2>Privacy</h2>
        <ul className={styles.list}>
          <li>No accounts, no database, no cookies, no analytics.</li>
          <li>
            Only the first half of the postcode (e.g. <code>WC2N</code>, an area of several thousand addresses) is sent,
            to postcodes.io, to find the area’s centre. The full postcode never leaves the browser.
          </li>
          <li>Nothing typed into the console is stored, on the server or in the browser.</li>
          <li>The patient summary link contains only the trust code, specialty and distance. No postcode, no name.</li>
        </ul>
      </section>

      <section id="licence" className={styles.section}>
        <h2>Licence and attribution</h2>
        <p>
          Contains public sector information from NHS England and the Care Quality Commission, and NHS Organisation Data
          Service data, licensed under the <a href={OGL}>Open Government Licence v3.0</a>.
        </p>
        <p>
          Postcode locations via postcodes.io: contains OS data © Crown copyright and database right; Royal Mail data ©
          Royal Mail copyright and database right; National Statistics data © Crown copyright and database right.
        </p>
        <p>
          Referral Compass is an independent prototype. It is not endorsed by NHS England or the CQC and is not medical
          advice. <Link href="/">Back to the console</Link>.
        </p>
      </section>
      </div>
    </main>
  );
}
