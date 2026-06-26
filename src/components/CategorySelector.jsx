import React, { useState } from "react";
import CategoryStyleRow from "./CategoryStyleRow";
import StarRating from "./StarRating";

export default function CategorySelector({
  allCategories,
  selectedCategories,
  categoryRatings,
  onToggleCategory,
  onRateCategory,
}) {
  const [expanded, setExpanded] = useState(false);
  const [focusedCategory, setFocusedCategory] = useState(
    () => selectedCategories[0] || allCategories[0] || ""
  );

  const handleToggleCategory = (category) => {
    onToggleCategory(category);
    setFocusedCategory(category);
    setExpanded(false);
  };

  const handleChipClick = (category) => {
    setFocusedCategory(category);
    if (!selectedCategories.includes(category)) {
      onToggleCategory(category);
    }
    setExpanded(false);
  };

  const focusedSelected = selectedCategories.includes(focusedCategory);
  const avgRating =
    selectedCategories.length > 0
      ? (
          selectedCategories.reduce((sum, c) => sum + (categoryRatings[c] || 0), 0) /
          selectedCategories.length
        ).toFixed(1)
      : "—";

  return (
    <section className="panel-luxury rounded-sm p-3 sm:p-4 mb-0 sm:mb-4 shrink-0" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-lcd text-[10px] tracking-[0.2em] text-xdj-cyan uppercase">
            Style Preferences
          </p>
          <h2 className="text-sm font-semibold text-xdj-text mt-1">סגנונות לאירוע — בחרו ודרגו</h2>
          <p className="text-[10px] text-xdj-muted mt-1 hidden sm:block">
            סמנו סגנון ודרגו מ-1 עד 5 כוכבים
          </p>
        </div>
        <span className="font-lcd text-[10px] text-xdj-gold tabular-nums">
          {selectedCategories.length}/{allCategories.length}
        </span>
      </div>

      <button
        type="button"
        className="category-mobile-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="text-right min-w-0">
          <span className="text-sm font-semibold text-xdj-text block truncate">
            {selectedCategories.length > 0
              ? `${selectedCategories.length} סגנונות נבחרו`
              : "בחרו סגנונות מוזיקה"}
          </span>
          <span className="text-[10px] text-xdj-muted">ממוצע דירוג: {avgRating}</span>
        </div>
        <span className={`category-mobile-chevron ${expanded ? "is-open" : ""}`}>▼</span>
      </button>

      <div className={`category-mobile-panel ${expanded ? "is-open" : ""}`}>
        <div className="category-mobile-chips">
          {allCategories.map((category) => {
            const isSelected = selectedCategories.includes(category);
            const isFocused = focusedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => handleChipClick(category)}
                className={`category-mobile-chip ${isSelected ? "is-selected" : ""} ${
                  isFocused ? "is-active" : ""
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
        {focusedCategory && (
          <div className="category-mobile-rating-row">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleToggleCategory(focusedCategory)}
                className={`chip-xdj shrink-0 ${focusedSelected ? "is-active" : ""}`}
              >
                {focusedSelected && "● "}
                {focusedCategory}
              </button>
              <StarRating
                rating={categoryRatings[focusedCategory] || 0}
                onRate={(star) => onRateCategory(focusedCategory, star)}
                compact
                touchFriendly
              />
            </div>
          </div>
        )}
      </div>

      <div className="category-desktop-list flex flex-col divide-y divide-xdj-border/30">
        {allCategories.map((category) => (
          <CategoryStyleRow
            key={category}
            category={category}
            isSelected={selectedCategories.includes(category)}
            rating={categoryRatings[category] || 0}
            onToggle={() => onToggleCategory(category)}
            onRate={(star) => onRateCategory(category, star)}
          />
        ))}
      </div>
    </section>
  );
}
