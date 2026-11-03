import { monthYear, yearsAgo, isOlderThan2Years } from '@/lib/format';
import styles from './CqcBadge.module.css';

const TONE = {
  Outstanding: 'outstanding',
  Good: 'good',
  'Requires improvement': 'ri',
  Inadequate: 'inadequate',
};

// CQC overall rating, always with its age, so an old rating never reads as current.
// If there is no overall rating, says so, and shows a Well-led-only rating if one exists.
export default function CqcBadge({ cqc }) {
  if (!cqc.rating) {
    return (
      <div className={styles.wrap}>
        <span className={`${styles.badge} ${styles.none}`}>Rating unavailable</span>
        {cqc.wellLed && (
          <span className={`${styles.badge} ${styles.outline} ${styles[TONE[cqc.wellLed.rating]]}`}>
            Well-led only: {cqc.wellLed.rating} ({monthYear(cqc.wellLed.date)})
          </span>
        )}
      </div>
    );
  }

  const years = yearsAgo(cqc.date);
  return (
    <div className={styles.wrap}>
      <span className={`${styles.badge} ${styles[TONE[cqc.rating]]}`}>{cqc.rating}</span>
      <span className={`${styles.age} ${isOlderThan2Years(cqc.date) ? styles.old : ''}`}>
        Last rated {monthYear(cqc.date)}
        {years >= 1 && ` · ${years} yr${years === 1 ? '' : 's'} ago`}
      </span>
    </div>
  );
}
