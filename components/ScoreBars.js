import styles from './ScoreBars.module.css';

export const FACTORS = [
  ['wait', 'Wait'],
  ['quality', 'Quality'],
  ['distance', 'Distance'],
];

// Score breakdown for the Evidence panel: one labelled bar per factor (0 to
// 100) with the weight it carries. Not shown on the main results view.
export default function ScoreBars({ scores, weights, qualityFlagged }) {
  return (
    <ul className={styles.bars}>
      {FACTORS.filter(([key]) => weights[key] > 0).map(([key, label]) => {
        const value = Math.round(scores[key] * 100);
        const flagged = key === 'quality' && qualityFlagged;
        return (
          <li key={key} className={styles.row}>
            <span className={styles.label}>
              {label} <span className={styles.weight}>weight {weights[key]}</span>
            </span>
            <span className={styles.track} aria-hidden="true">
              <span className={`${styles.fill} ${flagged ? styles.flagged : ''}`} style={{ width: `${value}%` }} />
            </span>
            <span className={styles.value}>
              {value}<span className="visually-hidden"> out of 100</span>
              {flagged && <span className="visually-hidden"> (no CQC overall rating, neutral score)</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
