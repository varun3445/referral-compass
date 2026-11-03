import Link from 'next/link';
import CqcBadge from './CqcBadge';
import Icon from './Icon';
import WaitBar from './WaitBar';
import { nav } from '@/lib/nav';
import { weeks, km, count } from '@/lib/format';
import { whySentence, closeCallName } from '@/lib/explain';
import styles from './HeroResult.module.css';

// Small muted line under a big number, with a tiny icon.
function Delta({ icon, children }) {
  return (
    <span className={styles.delta}>
      <Icon name={icon} size={14} />
      {children}
    </span>
  );
}

// The one clear suggestion: rank 1, three numbers, one reason, two actions.
export default function HeroResult({ result, ranking, maxWait, summaryHref, onEvidence }) {
  const { provider, wait, distanceKm } = result;
  const runnerUp = closeCallName(ranking);
  const within18 = Math.round(wait.pctWithin18);
  const extraWeeks = wait.medianWeeks - ranking.range.minWait;
  const extraKm = Math.round(distanceKm - ranking.nearest.distanceKm);

  return (
    <article className={styles.card} aria-labelledby="hero-name">
      <p className={styles.kicker}>Suggested for this patient</p>
      <h2 id="hero-name" className={styles.name}>{provider.name}</h2>
      {provider.isSpecialist && (
        <p className={styles.specialist}>Specialist or community service</p>
      )}

      <dl className={styles.tiles}>
        <div className={`${styles.tile} ${styles.waitTile}`}>
          <dt><Icon name="clock" size={16} /> Waiting so far</dt>
          <dd>
            <span className={styles.value}>
              <span className={styles.big}>{weeks(wait.medianWeeks)}</span>
              <span className={styles.unit}>weeks</span>
            </span>
            <WaitBar weeks={wait.medianWeeks} max={maxWait} />
            {extraWeeks < 0.05
              ? <Delta icon="check">Shortest of {ranking.consideredCount}</Delta>
              : <Delta icon="arrow-up-right">+{extraWeeks.toFixed(1)} weeks vs shortest</Delta>}
          </dd>
        </div>
        <div className={styles.tile}>
          <dt><Icon name="calendar" size={16} /> Seen within 18 weeks</dt>
          <dd>
            <span className={styles.value}>
              <span className={styles.big}>{within18}</span>
              <span className={styles.unit}>%</span>
            </span>
            <span className={styles.track} aria-hidden="true">
              <span className={styles.fill} style={{ width: `${within18}%` }} />
            </span>
            <Delta icon="info">{count(wait.totalWaiting)} waiting</Delta>
          </dd>
        </div>
        <div className={styles.tile}>
          <dt><Icon name="map-pin" size={16} /> Distance</dt>
          <dd>
            <span className={styles.value}>
              <span className={styles.big}>{km(distanceKm)}</span>
              <span className={styles.unit}>km</span>
            </span>
            {result.badges.nearest
              ? <Delta icon="check">Closest option</Delta>
              : <Delta icon="arrow-up-right">{extraKm < 1 ? 'About as close as the closest' : `+${extraKm} km vs closest`}</Delta>}
          </dd>
        </div>
      </dl>

      <div className={styles.cqc}><CqcBadge cqc={provider.cqc} highest={result.badges.highestRated} /></div>

      <p className={styles.why}>{whySentence(result, ranking)}</p>

      {runnerUp && (
        <p className={`inset ${styles.close}`}>
          <Icon name="info" size={18} />
          <span><strong>Close call:</strong> {runnerUp} scores almost the same.</span>
        </p>
      )}

      <div className={styles.actions}>
        <Link href={summaryHref} className="btn btn-primary" onClick={() => { nav.fromConsole = true; }}>
          <Icon name="file-text" size={18} />
          Create patient summary
        </Link>
        <button type="button" className="btn btn-secondary" onClick={onEvidence} aria-haspopup="dialog">
          See evidence
        </button>
      </div>
    </article>
  );
}
