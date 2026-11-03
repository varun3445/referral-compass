import Link from 'next/link';
import CqcBadge from './CqcBadge';
import Icon from './Icon';
import { nav } from '@/lib/nav';
import { weeks, km } from '@/lib/format';
import { whySentence, closeCallName } from '@/lib/explain';
import styles from './HeroResult.module.css';

// The one clear suggestion: rank 1, three numbers, one reason, two actions.
export default function HeroResult({ result, ranking, summaryHref, onEvidence }) {
  const { provider, wait, distanceKm } = result;
  const runnerUp = closeCallName(ranking);
  const within18 = Math.round(wait.pctWithin18);

  return (
    <article className={styles.card} aria-labelledby="hero-name">
      <p className={styles.kicker}>Suggested for this patient</p>
      <h2 id="hero-name" className={styles.name}>{provider.name}</h2>
      {provider.isSpecialist && (
        <p className={styles.specialist}>Specialist or community service</p>
      )}

      <dl className={styles.tiles}>
        <div className={styles.tile}>
          <dt>Waiting so far</dt>
          <dd>
            <span className={styles.big}>{weeks(wait.medianWeeks)}</span>
            <span className={styles.unit}>weeks</span>
          </dd>
        </div>
        <div className={styles.tile}>
          <dt>Seen within 18 weeks</dt>
          <dd>
            <span className={styles.big}>{within18}</span>
            <span className={styles.unit}>%</span>
          </dd>
          <span className={styles.track} aria-hidden="true">
            <span className={styles.fill} style={{ width: `${within18}%` }} />
          </span>
        </div>
        <div className={styles.tile}>
          <dt>Distance</dt>
          <dd>
            <span className={styles.big}>{km(distanceKm)}</span>
            <span className={styles.unit}>km</span>
          </dd>
        </div>
      </dl>

      <div className={styles.cqc}><CqcBadge cqc={provider.cqc} highest={result.badges.highestRated} /></div>

      <p className={styles.why}>{whySentence(result, ranking)}</p>

      {runnerUp && (
        <p className={`inset ${styles.close}`}>
          <Icon name="info" size={20} />
          <span><strong>Close call:</strong> {runnerUp} scores almost the same.</span>
        </p>
      )}

      <div className={styles.actions}>
        <Link href={summaryHref} className="btn btn-primary" onClick={() => { nav.fromConsole = true; }}>
          <Icon name="file-text" size={20} />
          Create patient summary
        </Link>
        <button type="button" className="btn btn-secondary" onClick={onEvidence} aria-haspopup="dialog">
          See evidence
        </button>
      </div>
    </article>
  );
}
