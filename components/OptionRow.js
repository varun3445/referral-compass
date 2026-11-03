import CqcBadge from './CqcBadge';
import Icon from './Icon';
import { weeks, km } from '@/lib/format';
import styles from './OptionRow.module.css';

// A compact "other option". The Evidence button stretches over the whole
// row, so the row is one big tap target with one accessible name.
export default function OptionRow({ result, onEvidence }) {
  const { provider, wait, distanceKm } = result;
  return (
    <li className={styles.row}>
      <div className={styles.main}>
        <h3 className={styles.name}>{provider.name}</h3>
        {provider.isSpecialist && <span className={styles.specialist}>Specialist or community service</span>}
        <CqcBadge cqc={provider.cqc} highest={result.badges.highestRated} />
      </div>
      <div className={styles.wait}>
        <span className={styles.big}>{weeks(wait.medianWeeks)}</span>
        <span className={styles.unit}>weeks</span>
      </div>
      <div className={styles.km}>{km(distanceKm)} km</div>
      <button type="button" className={styles.evidence} onClick={onEvidence} aria-haspopup="dialog">
        Evidence<span className="visually-hidden"> for {provider.name}</span>
        <Icon name="chevron-right" size={18} />
      </button>
    </li>
  );
}
