import React from "react";
import GenreVibeMeter from "./GenreVibeMeter";

export default function CategoryStyleRow({
  category,
  isSelected,
  rating,
  onToggle,
  onRate,
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5 px-2 rounded-sm transition-colors ${
        isSelected ? "bg-xdj-cyan/5" : "opacity-60 hover:opacity-80"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`chip-xdj shrink-0 self-start ${isSelected ? "is-active" : ""}`}
      >
        {isSelected && "● "}
        {category}
      </button>
      <div className="flex-1 min-w-0 max-w-md" onClick={(e) => e.stopPropagation()}>
        <GenreVibeMeter rating={rating} onRate={onRate} compact showLabel={false} />
      </div>
    </div>
  );
}
