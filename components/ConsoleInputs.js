'use client';
import meta from '@/data/meta.json';
import providers from '@/data/providers.json';
import { ratingAgeRange } from '@/lib/explain';
import styles from './ConsoleInputs.module.css';

export const DISTANCES = [10, 25, 50, 80];
const AGE = ratingAgeRange(providers);
export const PRIORITIES = [
  ['fastest', 'Shortest wait'],
  ['balanced', 'Balanced'],
];

// A group of radio buttons styled as choices. Arrow keys move between them.
// layout: 'grid' (2 equal columns) or 'segmented' (one full-width control).
function ChipGroup({ legend, name, options, value, onChange, layout = 'grid' }) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={layout === 'segmented' ? styles.segmented : styles.grid}>
        {options.map(([v, label]) => (
          <label key={v} className={styles.chip}>
            <input
              type="radio"
              name={name}
              value={v}
              checked={String(value) === String(v)}
              onChange={() => onChange(v)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function ConsoleInputs({ value, onChange, postcodeStatus, onSubmit, canSubmit }) {
  const set = (key) => (v) => onChange({ ...value, [key]: v });
  const { error, loading, resolved } = postcodeStatus;

  return (
    <form
      className={styles.form}
      aria-label="Referral details"
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
    >
      <div className={`${styles.field} ${error ? styles.hasError : ''}`}>
        <label htmlFor="postcode" className={styles.label}>Patient postcode</label>
        <p id="postcode-hint" className={styles.hint}>We only use the first part, e.g. WC2N</p>
        {error && (
          <p id="postcode-error" className={styles.error} role="alert">
            <span className="visually-hidden">Error: </span>{error}
          </p>
        )}
        <div className={styles.inputWrap}>
        <input
          id="postcode"
          className={styles.postcode}
          value={value.postcode}
          placeholder="e.g. WC2N"
          onChange={(e) => set('postcode')(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck="false"
          inputMode="text"
          enterKeyHint="search"
          aria-invalid={Boolean(error)}
          aria-describedby={`postcode-hint postcode-status${error ? ' postcode-error' : ''}`}
        />
        </div>
        <p id="postcode-status" className={styles.status} aria-live="polite">
          {loading ? 'Checking…' : resolved ? `Using ${resolved}` : ' '}
        </p>
      </div>

      <ChipGroup
        legend="Specialty"
        name="specialty"
        options={Object.entries(meta.specialties).sort((a, b) => a[1].localeCompare(b[1]))}
        value={value.specialty}
        onChange={set('specialty')}
      />

      <ChipGroup
        legend="Distance"
        name="maxKm"
        options={DISTANCES.map((d) => [d, `${d} km`])}
        value={value.maxKm}
        onChange={(v) => set('maxKm')(Number(v))}
        layout="segmented"
      />

      <ChipGroup
        legend="Priority"
        name="priority"
        options={PRIORITIES}
        value={value.priority}
        onChange={set('priority')}
        layout="segmented"
      />

      <details className={styles.more} open={value.includeSpecialist || value.includeQuality || undefined}>
        <summary>More options</summary>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={value.includeSpecialist}
            onChange={(e) => set('includeSpecialist')(e.target.checked)}
          />
          <span>Include specialist and community services</span>
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={value.includeQuality}
            onChange={(e) => set('includeQuality')(e.target.checked)}
          />
          <span>Include CQC rating in the ranking (ratings are {AGE.min} to {AGE.max} years old)</span>
        </label>
      </details>

      <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={!canSubmit}>
        Show results
      </button>
    </form>
  );
}
