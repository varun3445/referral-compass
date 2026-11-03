import meta from '@/data/meta.json';
import { monthYear } from '@/lib/format';
import styles from './FreshnessChip.module.css';

// Shows which month of NHS data and which CQC file the app is using.
export default function FreshnessChip() {
  return (
    <span className={styles.chip} title={`Waiting times: NHS England RTT ${meta.rttLabel}. CQC ratings file: ${monthYear(meta.cqcFileDate)}.`}>
      <span className={styles.dot} aria-hidden="true" />
      Data: RTT {meta.rttLabel} · CQC {monthYear(meta.cqcFileDate)}
    </span>
  );
}
