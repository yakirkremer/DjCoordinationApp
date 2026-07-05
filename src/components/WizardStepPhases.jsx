import React from "react";
import { EVENT_PHASES } from "../lib/preferences";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function WizardStepPhases({ phases, availableCategories, onTogglePhaseGenre, title, description, hideHeader = false }) {
  const { t, dir } = useI18n();

  if (availableCategories.length === 0) {
    return (
      <p className="text-sm text-amber-400" dir={dir}>
        {t("wizardPhases.noCategories")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" dir={dir}>
      {!hideHeader && (
        <div>
          <h2 className="text-xl font-bold text-xdj-text mb-2">{title ?? "מוזיקה לפי שלבי האירוע"}</h2>
          <p className="text-xs text-xdj-muted">
            {description ?? "לכל שלב באירוע, בחרו אילו סגנונות מתאימים (אפשר לבחור כמה)."}
          </p>
        </div>
      )}

      {EVENT_PHASES.map((phase) => (
        <div key={phase.id} className="border border-gray-800 rounded-xl p-4 bg-gray-950/50">
          <h3 className="text-sm font-bold text-purple-300 mb-3">{t(`phases.${phase.id}`)}</h3>
          <div className="wizard-phase-genre-list flex flex-wrap gap-2">
            {availableCategories.map((category) => {
              const selected = (phases[phase.id] ?? []).includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onTogglePhaseGenre(phase.id, category)}
                  className={`wizard-phase-genre-chip ${selected ? "is-selected" : ""}`}
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
