import CqcBadge from './CqcBadge';
import ScoreBars, { FACTORS } from './ScoreBars';
import { weeks, km, pct, count } from '@/lib/format';
import styles from './ShortlistCard.module.css';

// Column labels and weights, shown once above the cards.
export function ShortlistHeader({ weights }) {
  return (
    <div className={`${styles.grid} ${styles.header}`} aria-hidden="true">
      <span />
      <span>Trust</span>
      <span>Median wait</span>
      <span>CQC rating</span>
      <span>Distance</span>
      <span className={styles.scoreHead}>
        {FACTORS.map(([key, label]) => (
          <span key={key}>{label} <b>×{weights[key]}</b></span>
        ))}
        <span>Score</span>
      </span>
      <span />
    </div>
  );
}

const BADGES = [
  ['nearest', 'Nearest'],
  ['fastest', 'Fastest'],
  ['highestRated', 'Highest rated'],
];

// One ranked trust. Median wait is the hero number.
export default function ShortlistCard({ result, onEvidence, summaryHref }) {
  const { rank, provider, wait, distanceKm, scores, weights, total, qualityFlagged, tradeOff, badges } = result;

  return (
    <li className={`${styles.grid} ${styles.card} ${rank === 1 ? styles.first : ''}`}>
      <div className={styles.rank} aria-label={`Rank ${rank}`}>{rank}</div>

      <div className={styles.identity}>
        <h3 className={styles.name}>{provider.name}</h3>
        <div className={styles.tags}>
          {BADGES.filter(([k]) => badges[k]).map(([k, label]) => (
            <span key={k} className={styles.tag}>{label}</span>
          ))}
          {badges.closeCall && <span className={`${styles.tag} ${styles.close}`}>Close call: similar overall score</span>}
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
        <div className={styles.sub}>so far, for people on the list</div>
        <div className={styles.sub}>
          <span className="tabular">{pct(wait.pctWithin18)}</span> within 18 wks · <span className="tabular">{count(wait.totalWaiting)}</span> waiting
        </div>
      </div>

      <div><CqcBadge cqc={provider.cqc} /></div>

      <div>
        <div className={styles.km}><span className="tabular">{km(distanceKm)}</span> km</div>
        <div className={styles.sub}>to trust HQ</div>
      </div>

      <ScoreBars scores={scores} weights={weights} total={total} qualityFlagged={qualityFlagged} />

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={onEvidence} aria-haspopup="dialog">
          Evidence<span className="visually-hidden"> for {provider.name}</span>
        </button>
        <a className={styles.primary} href={summaryHref} target="_blank" rel="noopener">
          Select for summary<span className="visually-hidden"> ({provider.name}, opens in a new tab)</span>
        </a>
      </div>
    </li>
  );
}
