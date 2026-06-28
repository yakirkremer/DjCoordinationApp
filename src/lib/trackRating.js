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

const RATING_KEY_SEP = "::";

export function makeRatingKey(trackId, versionId) {
  if (!trackId) return "";
  if (!versionId) return trackId;
  return `${trackId}${RATING_KEY_SEP}${versionId}`;
}

export function parseRatingKey(key) {
  const sep = key.indexOf(RATING_KEY_SEP);
  if (sep === -1) return { trackId: key, versionId: null };
  return { trackId: key.slice(0, sep), versionId: key.slice(sep + RATING_KEY_SEP.length) };
}

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

export function getTrackRating(ratings, trackId, versionId = null) {
  if (!ratings || !trackId) return DEFAULT_TRACK_RATING;

  if (versionId) {
    const versionKey = makeRatingKey(trackId, versionId);
    if (versionKey in ratings) {
      return normalizeTrackRating(ratings[versionKey]);
    }
  }

  if (trackId in ratings) {
    return normalizeTrackRating(ratings[trackId]);
  }

  return DEFAULT_TRACK_RATING;
}

export function getTrackComment(comments, trackId, versionId = null) {
  if (!comments || !trackId) return "";

  if (versionId) {
    const versionKey = makeRatingKey(trackId, versionId);
    if (versionKey in comments) return comments[versionKey] ?? "";
  }

  return comments[trackId] ?? "";
}

/** True when the user explicitly saved a rating for this track version. */
export function hasExplicitRating(ratings, trackId, versionId, defaultVersionId = null) {
  if (!ratings || !trackId) return false;

  if (versionId) {
    const versionKey = makeRatingKey(trackId, versionId);
    if (versionKey in ratings) return true;
    if (trackId in ratings && defaultVersionId === versionId) return true;
    return false;
  }

  return trackId in ratings;
}

export function migrateTrackRatings(ratings = {}) {
  const next = {};
  for (const [key, value] of Object.entries(ratings)) {
    const normalized = normalizeTrackRating(value);
    if (normalized === DEFAULT_TRACK_RATING && value === undefined) continue;
    next[key] = normalized;
  }
  return next;
}
