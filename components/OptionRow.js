import CqcBadge from './CqcBadge';
import Icon from './Icon';
import WaitBar from './WaitBar';
import { weeks, km } from '@/lib/format';
import styles from './OptionRow.module.css';

// A compact "other option" card. The Evidence button stretches over the
// whole card, so it is one big tap target with one accessible name.
export default function OptionRow({ result, maxWait, onEvidence }) {
  const { provider, wait, distanceKm } = result;
  return (
    <li className={styles.row}>
      <div className={styles.main}>
        <h3 className={styles.name}>{provider.name}</h3>
        {provider.isSpecialist && <span className={styles.specialist}>Specialist or community service</span>}
        <CqcBadge cqc={provider.cqc} highest={result.badges.highestRated} />
      </div>
      <div className={styles.wait}>
        <span className={styles.value}>
          <span className={styles.big}>{weeks(wait.medianWeeks)}</span>
          <span className={styles.unit}>weeks</span>
        </span>
        <WaitBar weeks={wait.medianWeeks} max={maxWait} size="sm" />
      </div>
      <div className={styles.km}>
        <Icon name="map-pin" size={16} />
        <span className="nowrap">{km(distanceKm)} km</span>
      </div>
      <button type="button" className={styles.evidence} onClick={onEvidence} aria-haspopup="dialog">
        Evidence<span className="visually-hidden"> for {provider.name}</span>
        <Icon name="chevron-right" size={18} />
      </button>
    </li>
  );
}
