import { ensureTrackVersions } from "./trackVersions";
import { getTracksForGenre, isDropMirrorGenre, normGenreKey } from "./genreCatalog";
import {
  getTrackComment,
  getTrackRating,
  hasExplicitRating,
  normalizeTrackRating,
  TRACK_RATING,
} from "./trackRating";

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

function buildRatedTrackEntry(track, versionId, ratings, comments) {
  const normalized = ensureTrackVersions(track);
  const version = normalized.versions?.find((v) => v.id === versionId);
  return {
    id: normalized.id,
    versionId,
    drop: version?.drop?.trim() || "",
    title: normalized.title,
    artist: normalized.artist,
    bucket: normalized.bucket,
    comment: getTrackComment(comments, normalized.id, versionId)?.trim() ?? "",
  };
}

export function getLikedTracks(tracks, ratings, comments = {}) {
  const out = [];

  for (const raw of tracks) {
    const track = ensureTrackVersions(raw);
    for (const version of track.versions || []) {
      if (version.isMissing) continue;
      if (!hasExplicitRating(ratings, track.id, version.id, track.defaultVersionId)) continue;
      if (getTrackRating(ratings, track.id, version.id) !== TRACK_RATING.LIKE) continue;
      out.push(buildRatedTrackEntry(track, version.id, ratings, comments));
    }
  }

  return out;
}

/** Group explicitly rated tracks by category for client dashboard. */
export function getTracksByCategoryRating(tracks, ratings, comments = {}, selectedCategories = []) {
  const groups = {};

  for (const category of selectedCategories) {
    groups[category] = { liked: [], disliked: [] };
  }

  for (const category of selectedCategories) {
    const seen = new Set();
    const entries = getTracksForGenre(tracks, category);

    const pushRated = (track, versionId) => {
      const normalized = ensureTrackVersions(track);
      const dedupeKey = `${normalized.id}:${versionId}`;
      if (seen.has(dedupeKey)) return;
      if (!hasExplicitRating(ratings, normalized.id, versionId, normalized.defaultVersionId)) {
        return;
      }

      const rating = normalizeTrackRating(getTrackRating(ratings, normalized.id, versionId));
      if (rating !== TRACK_RATING.LIKE && rating !== TRACK_RATING.DISLIKE) return;

      seen.add(dedupeKey);
      const entry = buildRatedTrackEntry(normalized, versionId, ratings, comments);
      if (rating === TRACK_RATING.LIKE) {
        groups[category].liked.push(entry);
      } else {
        groups[category].disliked.push(entry);
      }
    };

    for (const { track, versionId } of entries) {
      const normalized = ensureTrackVersions(track);
      if (normalized.isMissing) continue;
      pushRated(normalized, versionId);
    }

    // In bucket genres, also show other rated versions of the same tracks (e.g. Techno rated while browsing Israeli).
    if (!isDropMirrorGenre(category)) {
      for (const raw of tracks) {
        const track = ensureTrackVersions(raw);
        if (normGenreKey(track.bucket) !== normGenreKey(category)) continue;
        for (const version of track.versions || []) {
          if (version.isMissing) continue;
          pushRated(track, version.id);
        }
      }
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
