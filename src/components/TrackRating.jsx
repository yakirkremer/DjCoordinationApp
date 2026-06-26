import React from "react";
import {
  DEFAULT_TRACK_RATING,
  TRACK_RATING,
  TRACK_RATING_OPTIONS,
  normalizeTrackRating,
} from "../lib/trackRating";

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
            <span className="track-rating-dot" aria-hidden />
            {!compact && <span className="track-rating-label">{option.labelHe}</span>}
          </button>
        );
      })}
    </div>
  );
}

export { DEFAULT_TRACK_RATING, TRACK_RATING };
