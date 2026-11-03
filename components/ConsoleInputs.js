'use client';
import meta from '@/data/meta.json';
import styles from './ConsoleInputs.module.css';

// One keyboard-friendly row: postcode, specialty, max distance, priority.
export default function ConsoleInputs({ value, onChange, postcodeStatus }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });
  const errorId = 'postcode-error';

  return (
    <form className={styles.form} onSubmit={(e) => e.preventDefault()} aria-label="Referral details">
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="postcode">Patient postcode</label>
          <input
            id="postcode"
            className={`${styles.input} ${postcodeStatus.error ? styles.invalid : ''}`}
            value={value.postcode}
            onChange={set('postcode')}
            placeholder="e.g. WC2N 5DU"
            autoComplete="off"
            spellCheck="false"
            autoFocus
            aria-invalid={Boolean(postcodeStatus.error)}
            aria-describedby={postcodeStatus.error ? errorId : 'postcode-hint'}
          />
          {postcodeStatus.error ? (
            <span id={errorId} className={styles.error} role="alert">{postcodeStatus.error}</span>
          ) : (
            <span id="postcode-hint" className={styles.hint} aria-live="polite">
              {postcodeStatus.loading
                ? 'Checking…'
                : postcodeStatus.resolved
                  ? `✓ Using area ${postcodeStatus.resolved} only`
                  : 'Only the area (e.g. WC2N) is sent. Nothing stored.'}
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="specialty">Specialty</label>
          <select id="specialty" className={styles.input} value={value.specialty} onChange={set('specialty')}>
            {Object.entries(meta.specialties).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>

        <div className={`${styles.field} ${styles.slider}`}>
          <label htmlFor="maxKm">Max distance <strong className="tabular">{value.maxKm} km</strong></label>
          <input
            id="maxKm"
            type="range"
            min="5"
            max="80"
            step="5"
            value={value.maxKm}
            onChange={(e) => onChange({ ...value, maxKm: Number(e.target.value) })}
          />
        </div>

        <fieldset className={styles.field}>
          <legend>Priority</legend>
          <div className={styles.toggle}>
            {[['fastest', 'Fastest'], ['balanced', 'Balanced']].map(([v, label]) => (
              <label key={v} className={value.priority === v ? styles.on : ''}>
                <input type="radio" name="priority" value={v} checked={value.priority === v} onChange={set('priority')} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <label className={styles.check}>
        <input
          type="checkbox"
          checked={value.includeSpecialist}
          onChange={(e) => onChange({ ...value, includeSpecialist: e.target.checked })}
        />
        Include specialist and community services
      </label>
    </form>
  );
}
