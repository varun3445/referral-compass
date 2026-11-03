'use client';
import Link from 'next/link';
import FreshnessChip from './FreshnessChip';
import DataButton from './DataButton';
import Icon from './Icon';
import { resetSession } from '@/lib/nav';
import styles from './TopBar.module.css';

// 64px header: brand left (also clears the search); data date and Data and
// limits right. On the desktop console, Data and limits moves to the top right
// of the results instead (see .headerData). No refresh: monthly snapshot data.
export default function TopBar() {
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} onClick={resetSession}>
          <span className={styles.logo}><Icon name="compass" size={20} /></span>
          <span className={styles.brandName}>Referral Compass</span>
        </Link>
        <div className={styles.right}>
          <FreshnessChip />
          <DataButton className="header-data" />
        </div>
      </div>
    </header>
  );
}
