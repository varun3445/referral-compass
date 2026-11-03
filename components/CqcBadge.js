import { monthYear, isOlderThan2Years } from '@/lib/format';
import styles from './CqcBadge.module.css';

export const CQC_TONE = {
  Outstanding: 'outstanding',
  Good: 'good',
  'Requires improvement': 'ri',
  Inadequate: 'inadequate',
};

// CQC rating as a text tag (never colour alone) with its publication date,
// e.g. "Good · Published Jul 2019". Ratings older than 2 years get a lighter
// outlined tag. No overall rating: "Not available" and the reason from the data.
export default function CqcBadge({ cqc, compact = false, highest = false }) {
  if (!cqc.rating) {
    return (
      <span className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
        <span className={`${styles.tag} ${styles.none}`}>
          <span className={styles.dot} aria-hidden="true" />
          <span className="visually-hidden">CQC rating: </span>Not available
        </span>
        {cqc.unavailableReason && <span className={styles.meta}>{cqc.unavailableReason}</span>}
      </span>
    );
  }

  const aged = isOlderThan2Years(cqc.date);
  return (
    <span className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <span className={`${styles.tag} ${styles[CQC_TONE[cqc.rating]]} ${aged ? styles.aged : ''}`}>
        <span className={styles.dot} aria-hidden="true" />
        <span className="visually-hidden">CQC rating: </span>{cqc.rating}
      </span>
      <span className={`${styles.meta} ${styles.date}`}><span className={styles.sep}>· </span>Published {monthYear(cqc.date)}</span>
      {highest && <span className={styles.highest}>Highest rated</span>}
    </span>
  );
}
