import React from "react";
import { OFFICIAL_CATEGORIES } from "../lib/categories";
import CategoryStyleRow from "./CategoryStyleRow";

export default function WizardStepGenres({
  selectedCategories,
  categoryRatings,
  onToggleCategory,
  onRateCategory,
  title = "אילו סגנונות מתאימים לכם?",
  description = "סמנו קטגוריות ודרגו כל סגנון מ-1 עד 5 כוכבים לפי כמה אתם אוהבים אותו.",
}) {
  return (
    <div className="flex flex-col gap-4" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-xdj-text mb-2">{title}</h2>
        {description && <p className="text-xs text-xdj-muted">{description}</p>}
      </div>

      <div className="flex flex-col divide-y divide-xdj-border/30 border border-xdj-border/50 rounded-sm">
        {OFFICIAL_CATEGORIES.map((category) => (
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

      {selectedCategories.length === 0 && (
        <p className="text-xs text-xdj-orange">יש לבחור לפחות סגנון אחד כדי להמשיך.</p>
      )}
    </div>
  );
}
