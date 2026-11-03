// Plain-English copy built from a ranking. Presentation only: it reads the
// output of lib/rank.js and never changes the ranking itself.

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// How this trust's wait compares with the shortest wait considered.
function waitPhrase(result, ranking) {
  const options = plural(ranking.consideredCount, 'option');
  if (ranking.consideredCount === 1) return 'Only option with published data';
  const extra = Math.round(result.wait.medianWeeks - ranking.range.minWait);
  if (result.wait.medianWeeks <= ranking.range.minWait) return `Shortest wait of ${options}`;
  if (extra < 1) return `Close to the shortest wait of ${options}`;
  return `${plural(extra, 'week')} longer than the shortest wait of ${options}`;
}

// How far this trust is compared with the closest one considered.
function distancePhrase(result, ranking) {
  if (result.badges.nearest) return 'the closest';
  const extra = Math.round(result.distanceKm - ranking.nearest.distanceKm);
  if (extra < 1) return 'about as close as the closest';
  return `${extra} km further than the closest`;
}

// e.g. "Shortest wait of 16 options and 2 km further than the closest."
export function whySentence(result, ranking) {
  return `${waitPhrase(result, ranking)} and ${distancePhrase(result, ranking)}.`;
}

// Name of the runner-up when the top two scores are within 0.03.
export function closeCallName(ranking) {
  return ranking.closeCall && ranking.results[1] ? ranking.results[1].provider.name : null;
}
