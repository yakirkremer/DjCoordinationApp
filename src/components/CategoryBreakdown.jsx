import React from "react";

export default function CategoryBreakdown({ breakdown }) {
  const { selectedCount, totalCount, percentage, categories } = breakdown;

  return (
    <section className="panel-luxury rounded-sm p-6" dir="rtl">
      <h3 className="text-lg font-bold text-xdj-text mb-1">סגנונות ודירוגים</h3>
      <p className="text-sm text-xdj-muted mb-6">
        הזוג בחר <span className="text-xdj-cyan font-bold">{selectedCount}</span> מתוך{" "}
        <span className="font-bold">{totalCount}</span> סגנונות ({percentage}%)
      </p>

      <div className="flex flex-col gap-3">
        {categories.map(({ category, selected, rating }) => (
          <div key={category} className="flex items-center gap-3">
            <span className="w-24 text-sm text-xdj-text shrink-0">{category}</span>
            <div className="flex-1 h-3 bg-[#0a0a0c] rounded-sm overflow-hidden border border-xdj-border">
              <div
                className={`h-full transition-all ${
                  rating > 0 ? "bg-xdj-gold" : selected ? "bg-xdj-cyan/50" : "bg-xdj-border"
                }`}
                style={{
                  width: rating > 0 ? `${(rating / 5) * 100}%` : selected ? "100%" : "0%",
                }}
              />
            </div>
            <span className="font-lcd text-xs w-16 text-left shrink-0">
              {rating > 0 ? (
                <span className="text-xdj-gold">{"★".repeat(rating)}</span>
              ) : selected ? (
                <span className="text-xdj-cyan">נבחר</span>
              ) : (
                <span className="text-xdj-muted">—</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
