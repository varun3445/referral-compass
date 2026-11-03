// Plain-English copy built from a ranking. Presentation only: it reads the
// output of lib/rank.js and never changes the ranking itself.

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// e.g. "Shortest wait of 16 options and 2 km further than the closest."
//      "Closest of 18 options, with a wait 2 weeks longer than the shortest."
export function whySentence(result, ranking) {
  const n = ranking.consideredCount;
  if (n === 1) return 'Only option with published data within this distance.';
  const options = plural(n, 'option');
  const shortest = result.wait.medianWeeks <= ranking.range.minWait;
  const closest = result.badges.nearest;
  const extraWeeks = Math.round(result.wait.medianWeeks - ranking.range.minWait);
  const extraKm = Math.round(result.distanceKm - ranking.nearest.distanceKm);

  const waitGap = extraWeeks < 1 ? 'a wait close to the shortest' : `a wait ${plural(extraWeeks, 'week')} longer than the shortest`;
  const kmGap = extraKm < 1 ? 'about as close as the closest' : `${extraKm} km further than the closest`;

  if (shortest && closest) return `Shortest wait and closest of ${options}.`;
  if (shortest) return `Shortest wait of ${options} and ${kmGap}.`;
  if (closest) return `Closest of ${options}, with ${waitGap}.`;
  return `Of ${options}: ${waitGap}, and ${kmGap}.`;
}

// Name of the runner-up when the top two scores are within 0.03.
export function closeCallName(ranking) {
  return ranking.closeCall && ranking.results[1] ? ranking.results[1].provider.name : null;
}

// Youngest and oldest CQC overall rating, in whole years, e.g. { min: 3, max: 8 }.
export function ratingAgeRange(providers, now = new Date()) {
  const years = providers
    .filter((p) => p.cqc.rating)
    .map((p) => {
      const d = new Date(p.cqc.date);
      let y = now.getFullYear() - d.getFullYear();
      if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) y--;
      return y;
    });
  return { min: Math.min(...years), max: Math.max(...years) };
}
