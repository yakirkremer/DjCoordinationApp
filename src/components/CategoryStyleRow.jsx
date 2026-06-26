import React from "react";
import StarRating from "./StarRating";

export default function CategoryStyleRow({
  category,
  isSelected,
  rating,
  onToggle,
  onRate,
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-2.5 px-2 rounded-sm transition-colors ${
        isSelected ? "bg-xdj-cyan/5" : "opacity-60 hover:opacity-80"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`chip-xdj shrink-0 ${isSelected ? "is-active" : ""}`}
      >
        {isSelected && "● "}
        {category}
      </button>
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="font-lcd text-[9px] text-xdj-muted hidden sm:inline">RATE</span>
        <StarRating rating={rating} onRate={onRate} compact />
      </div>
    </div>
  );
}
