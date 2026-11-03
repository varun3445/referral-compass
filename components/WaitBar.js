import styles from './WaitBar.module.css';

// Solid bar for one stat, scaled to a max (longest wait in the results,
// 100% for the 18 week share, or the selected distance limit).
// Decorative only: the value is always written as text.
export default function WaitBar({ value, max, size = 'md' }) {
  const pct = max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 0;
  return (
    <span className={`${styles.track} ${styles[size]}`} aria-hidden="true">
      <span className={styles.fill} style={{ width: `${pct}%` }} />
    </span>
  );
}
