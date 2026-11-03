import meta from '@/data/meta.json';
import { monthYear } from '@/lib/format';
import styles from './FreshnessChip.module.css';

// Which month of NHS waiting data and which CQC file the app is using.
// A monthly snapshot, so there is no refresh control.
export default function FreshnessChip() {
  return (
    <span className={`${styles.chip} chip-hide-mobile`}>
      <span className={styles.part}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.key}>NHS RTT</span> {meta.rttLabel}
      </span>
      <span className={`${styles.part} ${styles.extra}`}>
        <span className={styles.key}>CQC</span> {monthYear(meta.cqcFileDate)}
      </span>
    </span>
  );
}
