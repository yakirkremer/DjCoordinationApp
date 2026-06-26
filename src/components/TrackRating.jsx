import React from "react";
import {
  DEFAULT_TRACK_RATING,
  TRACK_RATING,
  TRACK_RATING_OPTIONS,
  normalizeTrackRating,
} from "../lib/trackRating";

const THUMB_UP_PATH =
  "M23 10a2 2 0 0 0-2-2h-6.68l.96-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10a2 2 0 0 0 2 2h10l3.6-7.2c.3-.6.9-1 1.4-1.8V10zM1 21h4V9H1v12z";

function RatingIcon({ type }) {
  if (type === TRACK_RATING.LIKE) {
    return (
      <svg className="track-rating-icon" viewBox="0 0 24 24" aria-hidden>
        <path fill="currentColor" d={THUMB_UP_PATH} />
      </svg>
    );
  }

  if (type === TRACK_RATING.DISLIKE) {
    return (
      <svg className="track-rating-icon track-rating-icon--down" viewBox="0 0 24 24" aria-hidden>
        <g transform="translate(0 24) scale(1 -1)">
          <path fill="currentColor" d={THUMB_UP_PATH} />
        </g>
      </svg>
    );
  }

  if (type === TRACK_RATING.OK) {
    return <span className="track-rating-ok-text">OK</span>;
  }

  return null;
}

export default function TrackRating({
  rating,
  onRate,
  compact = false,
  touchFriendly = false,
}) {
  const active = normalizeTrackRating(rating);

  return (
    <div
      className={`track-rating ${compact ? "track-rating--compact" : ""} ${
        touchFriendly ? "track-rating--touch" : ""
      }`}
      dir="ltr"
      role="group"
      aria-label="Track rating"
    >
      {TRACK_RATING_OPTIONS.map((option) => {
        const isActive = active === option.value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={isActive}
            aria-label={option.label}
            onClick={() => onRate(option.value)}
            className={`track-rating-btn track-rating-btn--${option.value} ${
              isActive ? "is-active" : ""
            }`}
          >
            <RatingIcon type={option.value} />
            {!compact && option.value !== TRACK_RATING.OK && (
              <span className="track-rating-label">{option.labelHe}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { DEFAULT_TRACK_RATING, TRACK_RATING };
