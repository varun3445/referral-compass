import Link from 'next/link';
import FreshnessChip from './FreshnessChip';
import Icon from './Icon';
import styles from './TopBar.module.css';

export default function TopBar() {
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <Icon name="compass" size={22} />
          Referral Compass
        </Link>
        <div className={styles.right}>
          <FreshnessChip />
          <Link href="/data" className={styles.link}>Data and limits</Link>
        </div>
      </div>
    </header>
  );
}
