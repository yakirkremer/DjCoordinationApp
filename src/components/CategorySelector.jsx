import React from "react";
import CategoryStyleRow from "./CategoryStyleRow";

export default function CategorySelector({
  allCategories,
  selectedCategories,
  categoryRatings,
  onToggleCategory,
  onRateCategory,
}) {
  return (
    <section className="panel-luxury rounded-sm p-4 mb-4" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-lcd text-[10px] tracking-[0.2em] text-xdj-cyan uppercase">
            Style Preferences
          </p>
          <h2 className="text-sm font-semibold text-xdj-text mt-1">סגנונות לאירוע — בחרו ודרגו</h2>
          <p className="text-[10px] text-xdj-muted mt-1">סמנו סגנון ודרגו מ-1 עד 5 כוכבים</p>
        </div>
        <span className="font-lcd text-[10px] text-xdj-gold tabular-nums">
          {selectedCategories.length}/{allCategories.length}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-xdj-border/30">
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
