export const TRACK_RATING = {
  LIKE: "like",
  OK: "ok",
  DISLIKE: "dislike",
};

export const DEFAULT_TRACK_RATING = TRACK_RATING.OK;

export const TRACK_RATING_OPTIONS = [
  {
    value: TRACK_RATING.DISLIKE,
    label: "Don't like",
    labelHe: "לא אהבתי",
    title: "Don't like",
  },
  {
    value: TRACK_RATING.OK,
    label: "I'm ok with it",
    labelHe: "בסדר",
    title: "I'm ok with it",
  },
  {
    value: TRACK_RATING.LIKE,
    label: "Like it",
    labelHe: "אהבתי",
    title: "Like it",
  },
];

export function normalizeTrackRating(value) {
  if (value === TRACK_RATING.LIKE || value === TRACK_RATING.OK || value === TRACK_RATING.DISLIKE) {
    return value;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) return DEFAULT_TRACK_RATING;
  if (numeric >= 4) return TRACK_RATING.LIKE;
  if (numeric <= 2) return TRACK_RATING.DISLIKE;
  return TRACK_RATING.OK;
}

export function getTrackRating(ratings, trackId) {
  return normalizeTrackRating(ratings?.[trackId]);
}

export function migrateTrackRatings(ratings = {}) {
  const next = {};
  for (const [trackId, value] of Object.entries(ratings)) {
    const normalized = normalizeTrackRating(value);
    if (normalized !== DEFAULT_TRACK_RATING || value !== undefined) {
      next[trackId] = normalized;
    }
  }
  return next;
}
