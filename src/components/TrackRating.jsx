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
          d="M7 22h4V9.3L5.4 4.6C4.8 3.6 5.5 2.25 6.7 2.25H9c.4 0 .8.2 1 .5l2.2 3.2H20c1.1 0 2 .9 2 2v6.8c0 .8-.5 1.5-1.2 1.9l-5.4 3.1c-.4.2-.8.4-1.3.4H11c-.6 0-1.1-.3-1.4-.8L7 22z"
        />
      </svg>
    );
  }

  if (type === TRACK_RATING.DISLIKE) {
    return (
      <svg className="track-rating-icon" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M17 2h-4v12.7l5.6 4.7c1 .6.7 1.95-.5 1.95H15c-.4 0-.8-.2-1-.5l-2.2-3.2H4c-1.1 0-2-.9-2-2V8.45c0-.8.5-1.5 1.2-1.9l5.4-3.1c.4-.2.8-.4 1.3-.4h2.1c.6 0 1.1.3 1.4.8L17 2z"
        />
      </svg>
    );
  }

  return (
    <svg className="track-rating-icon track-rating-icon--ok" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM8.5 17.5c0-1.2 1.57-2.25 3.5-2.25s3.5 1.05 3.5 2.25v.75H8.5v-.75z"
        opacity="0.95"
      />
    </svg>
  );
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
            {!compact && <span className="track-rating-label">{option.labelHe}</span>}
          </button>
        );
      })}
    </div>
  );
}

export { DEFAULT_TRACK_RATING, TRACK_RATING };
