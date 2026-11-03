import styles from './ScoreBars.module.css';

const ROWS = [
  ['wait', 'Wait'],
  ['quality', 'Quality'],
  ['distance', 'Distance'],
];

// Three small bars: how this trust scored on each factor (0 to 1) and the
// weight that factor carries for the chosen priority.
export default function ScoreBars({ scores, weights, qualityFlagged }) {
  return (
    <dl className={styles.bars}>
      {ROWS.map(([key, label]) => (
        <div key={key} className={styles.row}>
          <dt>
            {label}
            {key === 'quality' && qualityFlagged && <span title="No CQC overall rating: neutral score used"> *</span>}
          </dt>
          <dd>
            <span className={styles.track} aria-hidden="true">
              <span
                className={`${styles.fill} ${key === 'quality' && qualityFlagged ? styles.flagged : ''}`}
                style={{ width: `${Math.round(scores[key] * 100)}%` }}
              />
            </span>
            <span className={`${styles.value} tabular`}>
              {Math.round(scores[key] * 100)}
              <span className="visually-hidden"> out of 100, weight {Math.round(weights[key] * 100)}%</span>
            </span>
            <span className={styles.weight} aria-hidden="true">×{weights[key]}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
