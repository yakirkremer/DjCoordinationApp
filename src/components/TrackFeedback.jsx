import React from "react";
import StarRating from "./StarRating";
import TrackCommentInput from "./TrackCommentInput";

export default function TrackFeedback({ rating, comment, onRate, onCommentChange, compact = false }) {
  if (compact) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <StarRating rating={rating} onRate={onRate} compact />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4"
      onClick={(e) => e.stopPropagation()}
    >
      <StarRating rating={rating} onRate={onRate} />
      <TrackCommentInput value={comment} onChange={onCommentChange} />
    </div>
  );
}
