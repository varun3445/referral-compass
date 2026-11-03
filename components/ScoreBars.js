import styles from './ScoreBars.module.css';

export const FACTORS = [
  ['wait', 'Wait'],
  ['quality', 'Quality'],
  ['distance', 'Distance'],
];

// One bar per factor (0–100). Labels and weights live once in the
// shortlist header, so each card only shows the bars and numbers.
export default function ScoreBars({ scores, weights, total, qualityFlagged }) {
  return (
    <div className={styles.cells}>
      {FACTORS.map(([key, label]) => {
        const flagged = key === 'quality' && qualityFlagged;
        const value = Math.round(scores[key] * 100);
        return (
          <div key={key} className={styles.cell}>
            <span className="visually-hidden">{label} score, weight {Math.round(weights[key] * 100)}%:</span>
            <span className={styles.value}>
              {value}{flagged && <span title="No CQC overall rating: neutral score used">*</span>}
            </span>
            <span className={styles.track} aria-hidden="true">
              <span className={`${styles.fill} ${flagged ? styles.flagged : ''}`} style={{ width: `${value}%` }} />
            </span>
          </div>
        );
      })}
      <div className={`${styles.cell} ${styles.total}`}>
        <span className="visually-hidden">Overall score:</span>
        <span className={styles.value}>{Math.round(total * 100)}</span>
      </div>
    </div>
  );
}
