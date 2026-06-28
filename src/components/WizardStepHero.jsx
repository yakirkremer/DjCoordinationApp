import React from "react";
import { getWizardStepTheme } from "../lib/wizardStepTheme";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function WizardStepHero({ stepDef, currentStep, totalSteps }) {
  const { t, dir } = useI18n();
  if (!stepDef) return null;

  const theme = getWizardStepTheme(stepDef.stepType);

  return (
    <header
      className={`wizard-step-hero wizard-step-hero--${stepDef.stepType}`}
      style={{ "--wizard-accent": theme.accent }}
      dir={dir}
      aria-labelledby="wizard-step-title"
    >
      <div className="wizard-step-hero-glow" aria-hidden />
      <div className="wizard-step-hero-inner">
        <div className="wizard-step-hero-icon" aria-hidden>
          {theme.icon}
        </div>
        <div className="wizard-step-hero-text">
          <p className="wizard-step-hero-kicker">
            <span className="wizard-step-hero-count">
              {t("wizard.stepOf", { current: currentStep + 1, total: totalSteps })}
            </span>
            <span className="wizard-step-hero-type">{t(theme.kickerKey)}</span>
          </p>
          <h2 id="wizard-step-title" className="wizard-step-hero-title">
            {stepDef.title}
          </h2>
          {stepDef.description ? (
            <p className="wizard-step-hero-desc">{stepDef.description}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
