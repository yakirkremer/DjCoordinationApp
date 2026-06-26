import React from "react";

export default function StarRating({ rating, onRate, compact = false }) {
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate(star)}
          className={`transition-transform active:scale-110 ${
            compact ? "text-sm" : "text-xl"
          } ${
            star <= rating
              ? "text-xdj-gold drop-shadow-[0_0_6px_rgba(201,169,98,0.4)]"
              : "text-[#2a2a32] hover:text-xdj-muted"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
