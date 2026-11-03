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

// Top two within this many points of each other are flagged as a close call.
export const CLOSE_CALL = 0.03;

// 0..1 where 1 is best. If every value is the same, everyone gets 1.
function normaliseLowerIsBetter(value, min, max) {
  if (max === min) return 1;
  return (max - value) / (max - min);
}

/**
 * Ranks providers for one referral.
 * @returns {{ results, smallNumbers, excludedSpecialist, consideredCount, nearest, range, closeCall, fastestLowerRated }}
 */
export function rankProviders({ providers, origin, specialty, maxKm, priority, includeSpecialist = false, limit = 5 }) {
  const weights = WEIGHTS[priority] || WEIGHTS.balanced;

  const inRange = providers
    .filter((p) => p.specialties[specialty])
    .map((p) => ({ provider: p, wait: p.specialties[specialty], distanceKm: distanceKm(origin, p) }))
    .filter((r) => r.distanceKm <= maxKm);

  const smallNumbers = inRange.filter((r) => r.wait.smallNumbers);
  const excludedSpecialist = includeSpecialist ? [] : inRange.filter((r) => r.provider.isSpecialist && !r.wait.smallNumbers);
  const pool = inRange.filter((r) => !r.wait.smallNumbers && (includeSpecialist || !r.provider.isSpecialist));
  const empty = { results: [], smallNumbers, excludedSpecialist, consideredCount: 0, weights };
  if (pool.length === 0) return empty;

  const medians = pool.map((r) => r.wait.medianWeeks);
  const dists = pool.map((r) => r.distanceKm);
  const range = {
    minWait: Math.min(...medians), maxWait: Math.max(...medians),
    minKm: Math.min(...dists), maxKm: Math.max(...dists),
  };

  const scored = pool.map((r) => {
    const rating = r.provider.cqc.rating;
    const scores = {
      wait: normaliseLowerIsBetter(r.wait.medianWeeks, range.minWait, range.maxWait),
      quality: rating ? QUALITY_SCORE[rating] : UNRATED_QUALITY_SCORE,
      distance: normaliseLowerIsBetter(r.distanceKm, range.minKm, range.maxKm),
    };
    const total =
      scores.wait * weights.wait + scores.quality * weights.quality + scores.distance * weights.distance;
    return { ...r, scores, weights, total, qualityFlagged: !rating };
  });

  scored.sort((a, b) => b.total - a.total || a.wait.medianWeeks - b.wait.medianWeeks);

  // Badges are about the whole pool, not just the top 5.
  const nearest = scored.reduce((n, r) => (r.distanceKm < n.distanceKm ? r : n));
  const fastest = scored.reduce((f, r) => (r.wait.medianWeeks < f.wait.medianWeeks ? r : f));
  const bestQuality = Math.max(...scored.filter((r) => r.provider.cqc.rating).map((r) => r.scores.quality));
  const topRated = scored.filter((r) => r.provider.cqc.rating && r.scores.quality === bestQuality);
  // "Highest rated" only means something if it singles out one or two trusts.
  const highestRated = topRated.length <= 2 ? new Set(topRated) : new Set();

  const closeCall = scored.length > 1 && scored[0].total - scored[1].total <= CLOSE_CALL;

  const results = scored.slice(0, limit).map((r, i) => ({
    ...r,
    rank: i + 1,
    badges: {
      nearest: r === nearest,
      fastest: r === fastest,
      highestRated: highestRated.has(r),
      closeCall: closeCall && i < 2,
    },
    tradeOff: tradeOffLine(r, nearest, range.minWait),
  }));

  const top = results[0];
  const fastestLowerRated =
    priority === 'fastest' && ['Requires improvement', 'Inadequate'].includes(top.provider.cqc.rating);

  return {
    results, smallNumbers, excludedSpecialist, consideredCount: pool.length,
    nearest, range, weights, closeCall, fastestLowerRated,
  };
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
