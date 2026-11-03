import Link from 'next/link';
import CqcBadge from './CqcBadge';
import Icon from './Icon';
import WaitBar from './WaitBar';
import { nav } from '@/lib/nav';
import { weeks, km, count } from '@/lib/format';
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

// The one clear suggestion: rank 1, three numbers, one reason, two actions.
// Each stat tile has exactly three rows: label, number, one line of context.
export default function HeroResult({ result, ranking, maxWait, summaryHref, onEvidence }) {
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
        <p className={styles.kicker}>Suggested for this patient</p>
        <h2 id="hero-name" className={styles.name}>{provider.name}</h2>
        {provider.isSpecialist && <p className={styles.specialist}>Specialist or community service</p>}
      </div>

      <div className={styles.tilesWrap}>
        <dl className={styles.tiles}>
          <div className={`${styles.tile} ${styles.waitTile}`}>
            <dt className={styles.label}>Waiting so far</dt>
            <dd className={styles.row}><Value number={weeks(wait.medianWeeks)} unit="weeks" size="xl" /></dd>
            <dd className={styles.context}>
              <WaitBar weeks={wait.medianWeeks} max={maxWait} />
              <span className="visually-hidden">{waitContext}</span>
            </dd>
          </div>
          <div className={styles.tile}>
            <dt className={styles.label}>Waiting under 18 weeks</dt>
            <dd className={styles.row}><Value number={within18} unit="%" /></dd>
            <dd className={`${styles.context} ${styles.contextText}`}>of {count(wait.totalWaiting)} waiting</dd>
          </div>
          <div className={styles.tile}>
            <dt className={styles.label}>Distance</dt>
            <dd className={styles.row}><Value number={km(distanceKm)} unit="km" /></dd>
            <dd className={`${styles.context} ${styles.contextText}`}>{kmContext}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.meta}>
        <CqcBadge cqc={provider.cqc} highest={result.badges.highestRated} />
        <p className={styles.why}>{whySentence(result, ranking)}</p>
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
