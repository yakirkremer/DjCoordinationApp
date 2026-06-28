import React from "react";
import { ENERGY_LEVELS } from "../lib/preferences";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function WizardStepEnergy({ energyLevel, onSelect, title, description }) {
  const { t, dir } = useI18n();

  return (
    <div className="flex flex-col gap-4" dir={dir}>
      <div>
        <h2 className="text-xl font-bold text-xdj-text mb-2">{title ?? "מה רמת האנרגיה שאתם רוצים?"}</h2>
        <p className="text-xs text-xdj-muted">{description ?? "בחרו את האווירה הכללית של האירוע."}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ENERGY_LEVELS.map((level) => (
          <button
            key={level.id}
            type="button"
            onClick={() => onSelect(level.id)}
            className={`wizard-option-touch p-5 rounded-sm border text-right transition-all ${
              energyLevel === level.id
                ? "border-xdj-cyan bg-xdj-cyan/10 shadow-[0_0_20px_rgba(0,200,232,0.15)]"
                : "border-xdj-border bg-[#0a0a0c] hover:border-xdj-muted"
            }`}
          >
            <p className="text-lg font-bold text-xdj-text mb-1">{t(`energy.${level.id}.label`)}</p>
            <p className="text-xs text-xdj-muted">{t(`energy.${level.id}.description`)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
