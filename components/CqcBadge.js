import { monthYear } from '@/lib/format';
import styles from './CqcBadge.module.css';

export const CQC_TONE = {
  Outstanding: 'outstanding',
  Good: 'good',
  'Requires improvement': 'ri',
  Inadequate: 'inadequate',
};

// CQC rating as a text tag (never colour alone) plus when it was rated.
// No overall rating: says so, and shows any Well-led-only rating as context.
export default function CqcBadge({ cqc, compact = false, highest = false }) {
  if (!cqc.rating) {
    return (
      <span className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
        <span className={`${styles.tag} ${styles.none}`}>
          <span className={styles.dot} aria-hidden="true" />
          <span className="visually-hidden">CQC: </span>No rating
        </span>
        {cqc.wellLed && (
          <span className={styles.meta}>
            Well-led only: {cqc.wellLed.rating} ({monthYear(cqc.wellLed.date)})
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <span className={`${styles.tag} ${styles[CQC_TONE[cqc.rating]]}`}>
        <span className={styles.dot} aria-hidden="true" />
        <span className="visually-hidden">CQC rating: </span>{cqc.rating}
      </span>
      {highest && <span className={styles.highest}>Highest rated</span>}
      <span className={styles.meta}>Last rated {monthYear(cqc.date)}</span>
    </span>
  );
}
