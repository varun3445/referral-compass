import { monthYear } from '@/lib/format';
import styles from './CqcBadge.module.css';

export const CQC_TONE = {
  Outstanding: 'outstanding',
  Good: 'good',
  'Requires improvement': 'ri',
  Inadequate: 'inadequate',
};

// CQC overall rating with the month it was published, so an old rating
// never reads as current. If there is no overall rating, says so, and
// shows a Well-led-only rating if one exists.
export default function CqcBadge({ cqc }) {
  if (!cqc.rating) {
    return (
      <div className={styles.wrap}>
        <span className={`${styles.badge} ${styles.none}`}>Rating unavailable</span>
        {cqc.wellLed && (
          <span className={`${styles.badge} ${styles.outline} ${styles[CQC_TONE[cqc.wellLed.rating]]}`}>
            Well-led only: {cqc.wellLed.rating} ({monthYear(cqc.wellLed.date)})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <span className={`${styles.badge} ${styles[CQC_TONE[cqc.rating]]}`}>{cqc.rating}</span>
      <span className={styles.age}>Last rated {monthYear(cqc.date)}</span>
    </div>
  );
}
