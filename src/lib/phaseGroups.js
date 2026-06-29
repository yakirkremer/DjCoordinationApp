import { EVENT_PHASES } from "./preferences";

export function groupGenresByPhase(genreTabs = [], phases = {}) {
  const assigned = new Set();
  const groups = [];

  for (const phase of EVENT_PHASES) {
    const genres = (phases?.[phase.id] ?? []).filter((genre) => genreTabs.includes(genre));
    genres.forEach((genre) => assigned.add(genre));
    if (genres.length > 0) {
      groups.push({ id: phase.id, genres });
    }
  }

  const other = genreTabs.filter((genre) => !assigned.has(genre));
  if (other.length > 0) {
    groups.push({ id: "other", genres: other });
  }

  return groups.length > 0 ? groups : [{ id: "all", genres: genreTabs }];
}
