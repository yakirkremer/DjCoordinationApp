import React from "react";
import { getWizardStepTheme } from "../lib/wizardStepTheme";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function WizardProgress({
  currentStep,
  totalSteps,
  steps = [],
  stepProgress = [],
  onStepSelect,
}) {
  const { t, dir } = useI18n();
  const currentTheme = getWizardStepTheme(steps[currentStep]?.stepType);

  return (
    <nav className="wizard-stepper" aria-label={t("wizard.progressLabel")} dir={dir}>
      <ol className="wizard-stepper-track">
        {steps.map((stepDef, i) => {
          const theme = getWizardStepTheme(stepDef.stepType);
          const progress = stepProgress[i];
          const isComplete = progress?.complete ?? i < currentStep;
          const isCurrent = i === currentStep;
          const state = isCurrent ? "current" : isComplete ? "complete" : "upcoming";
          const canJump = isComplete && i < currentStep && typeof onStepSelect === "function";

          return (
            <li
              key={stepDef.id ?? i}
              className={`wizard-stepper-item wizard-stepper-item--${state}`}
              style={{ "--step-accent": theme.accent }}
              aria-current={isCurrent ? "step" : undefined}
            >
              <button
                type="button"
                className={`wizard-stepper-node${canJump ? " is-clickable" : ""}`}
                title={stepDef.title}
                disabled={!canJump}
                onClick={() => canJump && onStepSelect(i)}
                aria-label={
                  canJump
                    ? t("wizard.goToStep", { title: stepDef.title, step: i + 1 })
                    : t("wizard.stepOf", { current: i + 1, total: totalSteps })
                }
              >
                <span className="wizard-stepper-icon" aria-hidden>
                  {isComplete ? "✓" : theme.icon}
                </span>
                <span className="wizard-stepper-num">{i + 1}</span>
              </button>
              <span className="wizard-stepper-label">{stepDef.title}</span>
              {progress?.total > 0 ? (
                <span className="wizard-stepper-count" aria-hidden>
                  {progress.answered}/{progress.total}
                </span>
              ) : null}
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
