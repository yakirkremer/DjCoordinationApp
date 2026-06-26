import React from "react";
import { EVENT_PHASES } from "../lib/preferences";

export default function WizardStepPhases({ phases, availableCategories, onTogglePhaseGenre, title, description }) {
  if (availableCategories.length === 0) {
    return (
      <p className="text-sm text-amber-400" dir="rtl">
        חזרו לשלב הסגנונות ובחרו לפחות קטגוריה אחת.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-xdj-text mb-2">{title ?? "מוזיקה לפי שלבי האירוע"}</h2>
        <p className="text-xs text-xdj-muted">
          {description ?? "לכל שלב באירוע, בחרו אילו סגנונות מתאימים (אפשר לבחור כמה)."}
        </p>
      </div>

      {EVENT_PHASES.map((phase) => (
        <div key={phase.id} className="border border-gray-800 rounded-xl p-4 bg-gray-950/50">
          <h3 className="text-sm font-bold text-purple-300 mb-3">{phase.label}</h3>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((category) => {
              const selected = (phases[phase.id] ?? []).includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onTogglePhaseGenre(phase.id, category)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    selected
                      ? "bg-purple-600/30 border-purple-500 text-purple-200"
                      : "bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
