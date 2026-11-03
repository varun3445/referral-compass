const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2019-07-23" -> "Jul 2019"
export function monthYear(iso) {
  if (!iso) return null;
  const [y, m] = iso.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

// Whole years between an ISO date and today (or a given date).
export function yearsAgo(iso, now = new Date()) {
  if (!iso) return null;
  const d = new Date(iso);
  let years = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) years--;
  return years;
}

export const isOlderThan2Years = (iso) => yearsAgo(iso) >= 2;

export const weeks = (n) => (n == null ? '–' : n.toFixed(1));
export const km = (n) => (n < 10 ? n.toFixed(1) : Math.round(n).toString());
export const pct = (n) => `${Math.round(n)}%`;
export const count = (n) => n.toLocaleString('en-GB');

// "King's College Hospital NHS Foundation Trust" stays as is; this only
// tidies spacing so long names wrap nicely.
export const trustName = (s) => s.replace(/\s+/g, ' ').trim();
