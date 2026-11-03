import styles from './WaitBar.module.css';

// Bar for "waiting so far", scaled to the longest wait in the
// current results. Decorative only: the value is always written as text.
export default function WaitBar({ weeks, max, size = 'md' }) {
  const pct = max > 0 ? Math.max(4, Math.min(100, (weeks / max) * 100)) : 0;
  return (
    <span className={`${styles.track} ${styles[size]}`} aria-hidden="true">
      <span className={styles.fill} style={{ width: `${pct}%` }} />
    </span>
  );
}
