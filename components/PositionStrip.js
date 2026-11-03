import styles from './PositionStrip.module.css';

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// One row of dots: every trust in this search on a line from best to worst,
// with this trust highlighted. The caption says the same thing in words.
export default function PositionStrip({ label, values, current, format, best, worst }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const at = (v) => (max === min ? 50 : ((v - min) / (max - min)) * 100);
  const place = values.filter((v) => v < current - 1e-9).length + 1;
  const n = values.length;
  const caption = place === 1 ? `${best[0].toUpperCase()}${best.slice(1)} of ${n}` : `${ordinal(place)} ${best} of ${n}`;

  return (
    <div className={styles.strip}>
      <p className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={styles.caption}>{caption}</span>
      </p>
      <div className={styles.track} aria-hidden="true">
        <div className={styles.inner}>
          {values.map((v, i) => (
            <span key={i} className={styles.dot} style={{ '--f': at(v) / 100 }} />
          ))}
          <span className={styles.current} style={{ '--f': at(current) / 100 }} />
        </div>
      </div>
      <p className={styles.ends} aria-hidden="true">
        <span>{format(min)} {best}</span>
        <span>{format(max)} {worst}</span>
      </p>
    </div>
  );
}
