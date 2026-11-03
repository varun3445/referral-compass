import CqcBadge from './CqcBadge';
import ScoreBars from './ScoreBars';
import { weeks, km, pct, count } from '@/lib/format';
import styles from './ShortlistCard.module.css';

// One ranked trust. Median wait is the hero number.
export default function ShortlistCard({ result }) {
  const { rank, provider, wait, distanceKm, scores, weights, qualityFlagged, tradeOff, isNearest } = result;

  return (
    <li className={styles.card}>
      <div className={styles.rank} aria-label={`Rank ${rank}`}>{rank}</div>

      <div className={styles.identity}>
        <h3 className={styles.name}>{provider.name}</h3>
        <div className={styles.tags}>
          {isNearest && <span className={styles.tag}>Nearest</span>}
          {provider.isSpecialist && (
            <span className={`${styles.tag} ${styles.specialist}`} title={provider.specialistNote}>
              Specialist or community service
            </span>
          )}
        </div>
        <p className={styles.tradeOff}>{tradeOff}</p>
      </div>

      <div className={styles.wait}>
        <div className={styles.big}>
          <span className="tabular">{weeks(wait.medianWeeks)}</span>
          <span className={styles.unit}>wks</span>
        </div>
        <div className={styles.caption}>Median wait so far for people on the list</div>
        <div className={styles.sub}>
          <span className="tabular">{pct(wait.pctWithin18)}</span> within 18 wks ·{' '}
          <span className="tabular">{count(wait.totalWaiting)}</span> waiting
        </div>
      </div>

      <div className={styles.cqc}>
        <div className={styles.label}>CQC</div>
        <CqcBadge cqc={provider.cqc} />
      </div>

      <div className={styles.distance}>
        <div className={styles.label}>Distance</div>
        <div className={styles.km}><span className="tabular">{km(distanceKm)}</span> km</div>
        <div className={styles.sub}>to trust HQ</div>
      </div>

      <div className={styles.scores}>
        <ScoreBars scores={scores} weights={weights} qualityFlagged={qualityFlagged} />
      </div>
    </li>
  );
}
