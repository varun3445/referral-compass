'use client';
import meta from '@/data/meta.json';
import providers from '@/data/providers.json';
import { ratingAgeRange } from '@/lib/explain';
import Icon from './Icon';
import styles from './ConsoleInputs.module.css';

import { DISTANCES } from '@/lib/nav';
export { DISTANCES };
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
        {/* Takes no space when empty, but stays in the page for screen readers. */}
        <p id="postcode-status" className={loading || resolved ? styles.status : 'visually-hidden'} aria-live="polite">
          {loading ? 'Checking…' : resolved ? `Using ${resolved}` : ''}
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

      <details className={`${styles.more} ${styles.how}`}>
        <summary>
          How ranking works
          <Icon name="chevron-down" size={18} className={styles.chevron} />
        </summary>
        <ul className={styles.howList}>
          <li>Shortest wait leans towards the trust where people have waited the least so far, and still takes distance into account.</li>
          <li>Balanced weighs waiting so far and distance more evenly.</li>
          <li>Scores compare only the trusts in this search, so a trust can rank differently in another search.</li>
          <li>CQC ratings are optional and off by default, because the ratings in this data are several years old and cover the whole trust, not the specialty. You can include them under More options.</li>
          <li>Trusts with under {meta.minWaitingForRanking} people waiting are not ranked, because a few patients make the figure unreliable.</li>
          <li>If a trust has no CQC overall rating, it shows as Not available.</li>
        </ul>
      </details>

      <details className={styles.more}>
        <summary>
          More options
          <Icon name="chevron-down" size={18} className={styles.chevron} />
        </summary>
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
