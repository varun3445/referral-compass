import DataContent from '@/components/DataContent';
import styles from './data.module.css';

export const metadata = { title: 'Data and limits · Referral Compass' };

export default function DataPage() {
  return (
    <main className={styles.page}>
      <DataContent />
    </main>
  );
}
