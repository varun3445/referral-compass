import { distanceKm } from './geo';

// Quality score per CQC overall rating. null = no overall rating (neutral, flagged).
export const QUALITY_SCORE = {
  Outstanding: 1,
  Good: 0.75,
  'Requires improvement': 0.35,
  Inadequate: 0,
};
export const UNRATED_QUALITY_SCORE = 0.5;

export const WEIGHTS = {
  fastest: { wait: 0.6, quality: 0.2, distance: 0.2 },
  balanced: { wait: 0.4, quality: 0.3, distance: 0.3 },
};

// 0..1 where 1 is best. If every value is the same, everyone gets 1.
function normaliseLowerIsBetter(value, min, max) {
  if (max === min) return 1;
  return (max - value) / (max - min);
}

/**
 * Ranks providers for one referral.
 * @returns {{ results, smallNumbers, consideredCount }}
 *   results: top 5, each with distance, scores, total and a trade-off line
 *   smallNumbers: trusts in range left out because too few people are waiting
 */
export function rankProviders({ providers, origin, specialty, maxKm, priority, limit = 5 }) {
  const weights = WEIGHTS[priority] || WEIGHTS.balanced;

  const inRange = providers
    .filter((p) => p.specialties[specialty])
    .map((p) => ({ provider: p, wait: p.specialties[specialty], distanceKm: distanceKm(origin, p) }))
    .filter((r) => r.distanceKm <= maxKm);

  const smallNumbers = inRange.filter((r) => r.wait.smallNumbers);
  const pool = inRange.filter((r) => !r.wait.smallNumbers);
  if (pool.length === 0) return { results: [], smallNumbers, consideredCount: 0 };

  const medians = pool.map((r) => r.wait.medianWeeks);
  const dists = pool.map((r) => r.distanceKm);
  const [minW, maxW] = [Math.min(...medians), Math.max(...medians)];
  const [minD, maxD] = [Math.min(...dists), Math.max(...dists)];

  const scored = pool.map((r) => {
    const rating = r.provider.cqc.rating;
    const scores = {
      wait: normaliseLowerIsBetter(r.wait.medianWeeks, minW, maxW),
      quality: rating ? QUALITY_SCORE[rating] : UNRATED_QUALITY_SCORE,
      distance: normaliseLowerIsBetter(r.distanceKm, minD, maxD),
    };
    const total =
      scores.wait * weights.wait + scores.quality * weights.quality + scores.distance * weights.distance;
    return { ...r, scores, weights, total, qualityFlagged: !rating };
  });

  scored.sort((a, b) => b.total - a.total || a.wait.medianWeeks - b.wait.medianWeeks);

  // Trade-offs are always against the nearest provider in the pool.
  const nearest = scored.reduce((n, r) => (r.distanceKm < n.distanceKm ? r : n));
  const results = scored.slice(0, limit).map((r, i) => ({
    ...r,
    rank: i + 1,
    isNearest: r === nearest,
    tradeOff: tradeOffLine(r, nearest, minW),
  }));

  return { results, smallNumbers, consideredCount: pool.length, nearest };
}

// Plain-language comparison with the nearest provider.
export function tradeOffLine(r, nearest, fastestMedian) {
  if (r === nearest) {
    return r.wait.medianWeeks === fastestMedian
      ? 'Nearest option is also the fastest.'
      : 'This is the nearest option.';
  }
  const extraKm = Math.round(r.distanceKm - nearest.distanceKm);
  const diff = nearest.wait.medianWeeks - r.wait.medianWeeks; // positive = sooner
  const km = extraKm <= 0 ? 'About the same distance' : `+${extraKm} km`;
  if (Math.abs(diff) < 1) return `${km}, similar median wait to the nearest option.`;
  const weeks = Math.round(Math.abs(diff));
  const unit = weeks === 1 ? 'week' : 'weeks';
  return diff > 0
    ? `${km}, about ${weeks} ${unit} sooner (median) than the nearest option.`
    : `${km}, about ${weeks} ${unit} longer (median) than the nearest option.`;
}
