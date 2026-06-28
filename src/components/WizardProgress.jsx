import React from "react";
import { getWizardStepTheme } from "../lib/wizardStepTheme";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function WizardProgress({ currentStep, totalSteps, steps = [] }) {
  const { t, dir } = useI18n();
  const currentTheme = getWizardStepTheme(steps[currentStep]?.stepType);

  return (
    <nav className="wizard-stepper" aria-label={t("wizard.progressLabel")} dir={dir}>
      <ol className="wizard-stepper-track">
        {steps.map((stepDef, i) => {
          const theme = getWizardStepTheme(stepDef.stepType);
          const isComplete = i < currentStep;
          const isCurrent = i === currentStep;
          const state = isCurrent ? "current" : isComplete ? "complete" : "upcoming";

          return (
            <li
              key={stepDef.id ?? i}
              className={`wizard-stepper-item wizard-stepper-item--${state}`}
              style={{ "--step-accent": theme.accent }}
              aria-current={isCurrent ? "step" : undefined}
            >
              <div className="wizard-stepper-node" title={stepDef.title}>
                <span className="wizard-stepper-icon" aria-hidden>
                  {isComplete ? "✓" : theme.icon}
                </span>
                <span className="wizard-stepper-num">{i + 1}</span>
              </div>
              <span className="wizard-stepper-label">{stepDef.title}</span>
              {i < steps.length - 1 ? (
                <span
                  className={`wizard-stepper-connector${isComplete ? " is-filled" : ""}`}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      <div
        className="wizard-stepper-bar"
        style={{
          "--wizard-progress": totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 100,
          "--wizard-accent": currentTheme.accent,
        }}
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={t("wizard.stepOf", { current: currentStep + 1, total: totalSteps })}
      />
    </nav>
  );
}
