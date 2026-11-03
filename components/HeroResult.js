import Link from 'next/link';
import CqcBadge from './CqcBadge';
import InfoTip from './InfoTip';
import WaitBar from './WaitBar';
import PositionStrip from './PositionStrip';
import { nav } from '@/lib/nav';
import { weeks, km, count, distanceFrom, distanceNote } from '@/lib/format';
import meta from '@/data/meta.json';
import { whySentence, closeCallName } from '@/lib/explain';
import styles from './HeroResult.module.css';

// Number and unit on one baseline, never split across lines.
function Value({ number, unit, size }) {
  return (
    <span className={`${styles.value} ${size === 'xl' ? styles.xl : ''}`}>
      <span className={styles.number}>{number}</span>
      <span className={styles.unit}>{unit}</span>
    </span>
  );
}

// The top match for the chosen settings: three numbers, one reason, two actions.
// Each stat tile has four rows: label, number, bar, one line of context.
// Bars: wait vs the longest wait shown, 18 weeks vs 100%, distance vs the limit.
export default function HeroResult({ result, ranking, maxWait, maxKm, outcode, summaryHref, onEvidence }) {
  const { provider, wait, distanceKm } = result;
  const runnerUp = closeCallName(ranking);
  const within18 = Math.round(wait.pctWithin18);
  const extraWeeks = wait.medianWeeks - ranking.range.minWait;
  const extraKm = Math.round(distanceKm - ranking.nearest.distanceKm);
  const waitContext = extraWeeks < 0.05 ? `Shortest of ${ranking.consideredCount}` : `${extraWeeks.toFixed(1)} weeks more than the shortest`;
  const kmContext = result.badges.nearest ? 'Closest option' : extraKm < 1 ? 'About as close as the closest' : `+${extraKm} km vs closest`;

  return (
    <article className={styles.card} aria-labelledby="hero-name">
      <div className={styles.titleBlock}>
        <p className={styles.kicker}>Top match for your settings</p>
        <h2 id="hero-name" className={styles.name}>{provider.name}</h2>
        {provider.isSpecialist && <p className={styles.specialist}>Specialist or community service</p>}
      </div>

      <div className={styles.tilesWrap}>
        <dl className={styles.tiles}>
          <div className={`${styles.tile} ${styles.waitTile}`}>
            <dt className={styles.label}>Waiting so far</dt>
            <dd className={styles.row}><Value number={weeks(wait.medianWeeks)} unit="weeks" size="xl" /></dd>
            <dd className={styles.bar}><WaitBar value={wait.medianWeeks} max={maxWait} /></dd>
            <dd className={styles.context}>{waitContext}</dd>
          </div>
          <div className={styles.tile}>
            <dt className={styles.label}>
              Waiting under 18 weeks
              <InfoTip label="waiting under 18 weeks">
                Share of the {count(wait.totalWaiting)} people on this trust’s waiting list for this specialty who
                have waited under 18 weeks so far. NHS England RTT, incomplete pathways, {meta.rttLabel}. This is not
                people who have already been seen. Trusts with under {meta.minWaitingForRanking} waiting are not ranked.
              </InfoTip>
            </dt>
            <dd className={styles.row}><Value number={within18} unit="%" /></dd>
            <dd className={styles.bar}><WaitBar value={within18} max={100} /></dd>
            <dd className={styles.context}>of {count(wait.totalWaiting)} waiting</dd>
          </div>
          <div className={styles.tile}>
            <dt className={styles.label}>
              {distanceFrom(outcode)}
              <InfoTip label={distanceFrom(outcode).toLowerCase()}>{distanceNote(outcode)}</InfoTip>
            </dt>
            <dd className={styles.row}><Value number={km(distanceKm)} unit="km" /></dd>
            <dd className={styles.bar}><WaitBar value={distanceKm} max={maxKm} /></dd>
            <dd className={styles.context}>{kmContext}</dd>
          </div>
        </dl>
      </div>

      {ranking.consideredCount > 1 && (
        <section className={styles.whyBox} aria-labelledby="why-head">
          <div className={styles.whyText}>
            <h3 id="why-head" className={styles.whyHead}>Why it is the top match</h3>
            <p className={styles.why}>{whySentence(result, ranking)}</p>
          </div>
          <div className={styles.strips}>
            <PositionStrip
              label="Waiting so far"
              values={ranking.results.map((r) => r.wait.medianWeeks)}
              current={wait.medianWeeks}
              format={(v) => `${weeks(v)} wks`}
              best="shortest"
              worst="longest"
            />
            <PositionStrip
              label={distanceFrom(outcode)}
              values={ranking.results.map((r) => r.distanceKm)}
              current={distanceKm}
              format={(v) => `${km(v)} km`}
              best="closest"
              worst="furthest"
            />
          </div>
          <p className={styles.legend}>
            <span className={styles.keyThis} aria-hidden="true" /> This trust
            <span className={styles.keyOther} aria-hidden="true" /> Other trusts in this search
          </p>
        </section>
      )}

      <div className={styles.meta}>
        <CqcBadge cqc={provider.cqc} highest={result.badges.highestRated} />
        {ranking.consideredCount === 1 && <p className={styles.why}>{whySentence(result, ranking)}</p>}
      </div>

      {runnerUp && (
        <p className={`inset ${styles.close}`}>
          <span><strong>Close call:</strong> {runnerUp} scores almost the same.</span>
        </p>
      )}

      <div className={styles.actions}>
        <Link href={summaryHref} className="btn btn-primary" onClick={() => { nav.fromConsole = true; }}>
          Create patient summary
        </Link>
        <button type="button" className="btn btn-secondary" onClick={onEvidence} aria-haspopup="dialog">
          See evidence
        </button>
      </div>
    </article>
  );
}
