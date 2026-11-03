import Link from 'next/link';
import FreshnessChip from './FreshnessChip';
import styles from './TopBar.module.css';

export default function TopBar() {
  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.brand}>
        <span className={styles.mark} aria-hidden="true">◎</span> Referral Compass
      </Link>
      <div className={styles.right}>
        <FreshnessChip />
        <Link href="/data" className={styles.link}>Data &amp; limits</Link>
      </div>
    </header>
  );
}
