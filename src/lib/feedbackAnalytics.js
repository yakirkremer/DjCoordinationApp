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

/** Group explicitly rated tracks by category for client dashboard. */
export function getTracksByCategoryRating(tracks, ratings, comments = {}, selectedCategories = []) {
  const selected = new Set(selectedCategories);
  const groups = {};

  for (const category of selectedCategories) {
    groups[category] = { liked: [], disliked: [] };
  }

  for (const track of tracks) {
    if (track.isMissing || !selected.has(track.bucket)) continue;
    if (!(track.id in ratings)) continue;

    const rating = normalizeTrackRating(ratings[track.id]);
    const entry = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      comment: comments[track.id]?.trim() ?? "",
    };

    if (!groups[track.bucket]) {
      groups[track.bucket] = { liked: [], disliked: [] };
    }

    if (rating === TRACK_RATING.LIKE) {
      groups[track.bucket].liked.push(entry);
    } else if (rating === TRACK_RATING.DISLIKE) {
      groups[track.bucket].disliked.push(entry);
    }
  }

  return selectedCategories.map((category) => ({
    category,
    liked: groups[category]?.liked ?? [],
    disliked: groups[category]?.disliked ?? [],
  }));
}

/** @deprecated Use getLikedTracks */
export function getFiveStarTracks(tracks, ratings, comments = {}) {
  return getLikedTracks(tracks, ratings, comments);
}
