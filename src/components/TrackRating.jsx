import React from "react";
import {
  DEFAULT_TRACK_RATING,
  TRACK_RATING,
  TRACK_RATING_OPTIONS,
  normalizeTrackRating,
} from "../lib/trackRating";

function RatingIcon({ type }) {
  if (type === TRACK_RATING.LIKE) {
    return (
      <svg className="track-rating-icon" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M23 10a2 2 0 0 0-2-2h-6.68l.96-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10a2 2 0 0 0 2 2h10l3.6-7.2c.3-.6.9-1 1.4-1.8V10zM1 21h4V9H1v12z"
        />
      </svg>
    );
  }

  if (type === TRACK_RATING.DISLIKE) {
    return (
      <svg className="track-rating-icon" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M19 15h4V3h-4v12zM15 19.66V9h-5.5l.58-2.71c.12-.57.04-1.15-.24-1.65L8.67 2.6A2.5 2.5 0 0 0 4.5 4.5L6.65 8.28c.2.36.35.76.35 1.22v10.16c0 .74.6 1.34 1.34 1.34h5.32c.74 0 1.34-.6 1.34-1.34z"
        />
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
