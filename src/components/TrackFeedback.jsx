import React, { useState } from "react";
import TrackRating from "./TrackRating";
import TrackCommentInput from "./TrackCommentInput";
import { normalizeTrackRating } from "../lib/trackRating";

export default function TrackFeedback({
  rating,
  comment,
  onRate,
  onCommentChange,
  compact = false,
  mobile = false,
  hideRating = false,
}) {
  const [showComment, setShowComment] = useState(Boolean(comment));
  const activeRating = normalizeTrackRating(rating);

  if (compact && !mobile) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <TrackRating rating={activeRating} onRate={onRate} compact />
      </div>
    );
  }

  if (mobile) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        {!hideRating && (
          <TrackRating rating={activeRating} onRate={onRate} compact touchFriendly />
        )}
        {!showComment ? (
          <button
            type="button"
            className="xdj-az-track-card-comment-toggle"
            onClick={() => setShowComment(true)}
          >
            {comment ? "עריכת הערה" : "הוסף הערה"}
          </button>
        ) : (
          <div className="xdj-az-track-card-comment">
            <TrackCommentInput value={comment} onChange={onCommentChange} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4"
      onClick={(e) => e.stopPropagation()}
    >
      <TrackRating rating={activeRating} onRate={onRate} />
      <TrackCommentInput value={comment} onChange={onCommentChange} />
    </div>
  );
}
