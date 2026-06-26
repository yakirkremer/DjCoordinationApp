import { normalizeTrackRating, TRACK_RATING } from "./trackRating";

export function getCategoryBreakdown(allCategories, selectedCategories, categoryRatings = {}) {
  const selected = new Set(selectedCategories);
  const selectedCount = allCategories.filter((c) => selected.has(c)).length;

  return {
    selectedCount,
    totalCount: allCategories.length,
    percentage: allCategories.length
      ? Math.round((selectedCount / allCategories.length) * 100)
      : 0,
    categories: allCategories.map((category) => ({
      category,
      selected: selected.has(category),
      rating: categoryRatings[category] || 0,
    })),
  };
}

export function getLikedTracks(tracks, ratings, comments = {}) {
  return tracks
    .filter((t) => !t.isMissing && normalizeTrackRating(ratings[t.id]) === TRACK_RATING.LIKE)
    .map((track) => ({
      ...track,
      comment: comments[track.id] ?? "",
    }));
}

/** @deprecated Use getLikedTracks */
export function getFiveStarTracks(tracks, ratings, comments = {}) {
  return getLikedTracks(tracks, ratings, comments);
}
