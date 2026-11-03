import meta from '@/data/meta.json';
import { monthYear } from '@/lib/format';
import styles from './FreshnessChip.module.css';

// Which month of NHS waiting data and which CQC file the app is using.
export default function FreshnessChip() {
  return (
    <span className={`${styles.chip} chip-hide-mobile`}>
      <span className={styles.dot} aria-hidden="true" />
      NHS data {meta.rttLabel}
      <span className={styles.extra}> · CQC {monthYear(meta.cqcFileDate)}</span>
    </span>
  );
}
