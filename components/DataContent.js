import Link from 'next/link';
import providers from '@/data/providers.json';
import meta from '@/data/meta.json';
import { WEIGHTS, WEIGHTS_WITH_QUALITY, QUALITY_SCORE, UNRATED_QUALITY_SCORE, CLOSE_CALL } from '@/lib/rank';
import { ratingAgeRange } from '@/lib/explain';
import { monthYear } from '@/lib/format';
import { rankProviders } from '@/lib/rank';
import { weeks, count, km } from '@/lib/format';
import styles from './DataContent.module.css';


// Facts about this build, worked out from the data so the page never drifts.
const rated = providers.filter((p) => p.cqc.rating);
const ratingDates = rated.map((p) => p.cqc.date).sort();
const STATS = {
  trusts: providers.length,
  rated: rated.length,
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
  ['“Waiting so far”, not time to appointment', 'Waiting so far is the middle value of how long people currently on the list have waited. It is not a prediction of when a new patient will be seen.'],
  ['Distance to trust HQ is approximate', 'Distance to trust HQ is a straight line from the centre of the patient’s postcode area (for example WC2N) to the trust’s recorded main office. The clinic may be at another site. It does not say how long it takes to get there.'],
  ['CQC ratings are trust-wide and old', `A rating covers the whole trust, not the specialty. Overall ratings in this data set are ${AGE.min} to ${AGE.max} years old (oldest ${STATS.oldest}, newest ${STATS.newest}). Because of this, CQC ratings are shown as context but are not used in the ranking unless the GP ticks “Include CQC rating in the ranking”.`],
  ['Well-led-only trusts', `${STATS.wellLedOnly} trusts have only a trust-level Well-led rating from CQC’s newer approach, with no overall rating. They show “Not available” with the reason, and, only when CQC is included in the ranking, are given a neutral quality score of ${UNRATED_QUALITY_SCORE}. Well-led is never used as a stand-in for the overall rating.`],
  ['Small numbers', `Trust and specialty pairs with fewer than ${meta.minWaitingForRanking} people waiting are not ranked (a figure from a handful of patients is noise). They are listed under the shortlist. There are ${STATS.smallPairs} such pairs.`],
  ['Specialist and community services', `${STATS.specialist.length} trusts are tagged as specialist or community services (${STATS.specialist.join(', ')}). They are hidden from the ranking unless the GP ticks “Include specialist and community services”, and keep their tag when shown.`],
  ['London area only', `Only the ${STATS.trusts} NHS trusts in and around London are included, to keep the data reviewable. Independent sector providers are not included.`],
  ['Five specialties', `${Object.values(meta.specialties).join(', ')}. Pain Management is left out because NHS England does not publish it as its own specialty; it is grouped into “Other” categories that mix several services.`],
  ['Not for urgent referrals', 'Urgent and suspected cancer referrals follow faster pathways. This tool is for routine outpatient referrals only.'],
];

// Same content on /data (direct links and print) and in the header modal.
export default function DataContent({ titleId = 'data-title', bare = false }) {
  return (
    <div className={`${styles.card} ${bare ? styles.bare : ''}`}>
      <div className={styles.intro}>
        <h1 id={titleId}>Data and limits</h1>
        <p>
          Referral Compass is an independent prototype, not an NHS service. Every number comes from public NHS data and is shown with its source and date.
          This page explains where the data comes from, how each number is worked out, and what it cannot tell you.
        </p>
        <nav aria-label="On this page" className={styles.toc}>
          <a href="#sources">Sources</a>
          <a href="#calculations">How numbers are calculated</a>
          <a href="#ranking">How the ranking is worked out</a>
          <a href="#limits">Known limits</a>
          <a href="#privacy">Privacy</a>
          <a href="#licence">Licence</a>
        </nav>
      </div>

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
            <dt>Waiting so far</dt>
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
            <dt>Waiting under 18 weeks</dt>
            <dd><code>people in weeks 0 to 18 ÷ people waiting × 100</code></dd>
          </div>
          <div>
            <dt>Distance to trust HQ</dt>
            <dd>Haversine (great-circle) distance in km from the centre of the patient’s postcode area to the trust’s registered postcode.</dd>
          </div>
          <div>
            <dt>CQC rating age</dt>
            <dd>Taken from the rating’s publication date in the CQC file. Ratings published more than 2 years ago are flagged.</dd>
          </div>
        </dl>
        <p className={styles.aside}>
          The full pipeline is
          in <a href="https://github.com/varun3445/referral-compass/blob/main/scripts/build-data.mjs">scripts/build-data.mjs</a>.
        </p>
      </section>

      <section id="ranking" className={styles.section}>
        <h2>How the ranking is worked out</h2>
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
        <WorkedExample />
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
  );
}

// A worked example with real numbers: Rheumatology, WC2N, 10 km, Balanced, CQC off.
const WC2N = { lat: 51.50998, lng: -0.12384 };
const n2 = (x) => x.toFixed(2);
function WorkedExample() {
  const r = rankProviders({ providers, origin: WC2N, specialty: '410', maxKm: 10, priority: 'balanced' });
  const t = r.results[0];
  const w = t.wait.medianWorking;
  return (
    <div className={styles.example}>
      <h3>Worked example</h3>
      <p>
        Rheumatology, WC2N, within 10 km, Balanced, CQC off. {r.consideredCount} trusts compared. Top match:{' '}
        <strong>{t.provider.name}</strong>.
      </p>
      <ul className={styles.list}>
        <li>Waiting so far: <code>target = {count(t.wait.totalWaiting)} × 0.5 = {w?.target}; week {w?.lowerWeek} + ({w?.target} − {count(w?.before ?? 0)}) ÷ {count(w?.inBucket ?? 0)} = {weeks(t.wait.medianWeeks)} weeks</code></li>
        <li>Wait score: <code>({weeks(r.range.maxWait)} − {weeks(t.wait.medianWeeks)}) ÷ ({weeks(r.range.maxWait)} − {weeks(r.range.minWait)}) = {n2(t.scores.wait)}</code></li>
        <li>Distance score: <code>({km(r.range.maxKm)} − {km(t.distanceKm)}) ÷ ({km(r.range.maxKm)} − {km(r.range.minKm)}) = {n2(t.scores.distance)}</code></li>
        <li>Overall: <code>{t.weights.wait} × {n2(t.scores.wait)} + {t.weights.distance} × {n2(t.scores.distance)} = {n2(t.total)}</code></li>
      </ul>
    </div>
  );
}
