import React, { useState, useMemo, useEffect } from "react";
import WizardProgress from "./WizardProgress";
import WizardStepHero from "./WizardStepHero";
import DynamicWizardStep from "./DynamicWizardStep";
import WizardStepGenres from "./WizardStepGenres";
import WizardStepEnergy from "./WizardStepEnergy";
import WizardStepPhases from "./WizardStepPhases";
import WizardStepPlaylists from "./WizardStepPlaylists";
import WizardStepTimeline from "./WizardStepTimeline";
import WizardStepSummary from "./WizardStepSummary";
import { validateQuestionsStep } from "../lib/formAnswers";
import { filterStepsForClientType } from "../lib/formFilter";
import { useI18n } from "../lib/i18n/AppSettingsContext";

function clampStep(step, totalSteps) {
  if (totalSteps <= 0) return 0;
  return Math.min(Math.max(0, step), totalSteps - 1);
}

export default function PreferencesWizard({
  formSchema,
  clientType,
  preferences,
  selectedCategories,
  categoryRatings,
  onUpdatePreferences,
  onToggleCategory,
  onRateCategory,
  onComplete,
  onSkip,
  onSaveProgress,
  onSaveAndExit,
}) {
  const { t, dir } = useI18n();
  const steps = useMemo(
    () => filterStepsForClientType(formSchema?.steps ?? [], clientType),
    [formSchema, clientType]
  );
  const [step, setStep] = useState(() => clampStep(preferences.wizardStep ?? 0, steps.length));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStep(clampStep(preferences.wizardStep ?? 0, steps.length));
  }, [clientType, steps.length]);

  const currentStepDef = steps[step];

  const persistStep = (nextStep) => {
    setStep(nextStep);
    onUpdatePreferences({ wizardStep: nextStep });
  };

  const handleTogglePhaseGenre = (phaseId, category) => {
    const current = preferences.phases[phaseId] ?? [];
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    onUpdatePreferences({ phases: { [phaseId]: next } });
  };

  const canAdvance = () => {
    if (!currentStepDef) return false;
    if (currentStepDef.stepType === "questions") {
      return validateQuestionsStep(preferences, currentStepDef.questions);
    }
    if (currentStepDef.stepType === "genres") return selectedCategories.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < steps.length - 1 && canAdvance()) {
      persistStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) persistStep(step - 1);
  };

  const handleSaveAndExit = async () => {
    setSaving(true);
    try {
      await onSaveProgress(step);
      onSaveAndExit();
    } finally {
      setSaving(false);
    }
  };

  const stepType = currentStepDef?.stepType ?? "questions";

  const renderStep = () => {
    if (!currentStepDef) return null;

    switch (currentStepDef.stepType) {
      case "questions":
        return (
          <DynamicWizardStep
            step={currentStepDef}
            preferences={preferences}
            onUpdatePreferences={onUpdatePreferences}
            hideHeader
          />
        );
      case "genres":
        return (
          <WizardStepGenres
            selectedCategories={selectedCategories}
            categoryRatings={categoryRatings}
            onToggleCategory={onToggleCategory}
            onRateCategory={onRateCategory}
            title={currentStepDef.title}
            description={currentStepDef.description}
            hideHeader
          />
        );
      case "energy":
        return (
          <WizardStepEnergy
            energyLevel={preferences.energyLevel}
            onSelect={(id) => onUpdatePreferences({ energyLevel: id })}
            title={currentStepDef.title}
            description={currentStepDef.description}
            hideHeader
          />
        );
      case "phases":
        return (
          <WizardStepPhases
            phases={preferences.phases}
            availableCategories={selectedCategories}
            onTogglePhaseGenre={handleTogglePhaseGenre}
            title={currentStepDef.title}
            description={currentStepDef.description}
            hideHeader
          />
        );
      case "timeline":
        return (
          <WizardStepTimeline
            preferences={preferences}
            templateItems={currentStepDef.timelineItems ?? []}
            onUpdatePreferences={onUpdatePreferences}
            title={currentStepDef.title}
            description={currentStepDef.description}
            hideHeader
          />
        );
      case "playlists":
        return (
          <WizardStepPlaylists
            mustPlay={preferences.mustPlay}
            doNotPlay={preferences.doNotPlay}
            djNotes={preferences.djNotes}
            onUpdate={onUpdatePreferences}
            title={currentStepDef.title}
            description={currentStepDef.description}
            hideHeader
          />
        );
      case "summary":
        return (
          <WizardStepSummary
            formSchema={formSchema}
            clientType={clientType}
            preferences={preferences}
            selectedCategories={selectedCategories}
            categoryRatings={categoryRatings}
            onComplete={onComplete}
            onSkip={onSkip}
            title={currentStepDef.title}
            description={currentStepDef.description}
            hideHeader
          />
        );
      default:
        return null;
    }
  };

  const isSummary = currentStepDef?.stepType === "summary";

  return (
    <section className={`panel-luxury rounded-sm p-4 sm:p-6 lg:p-8 wizard-shell wizard-shell--${stepType}`} dir={dir}>
      <WizardProgress currentStep={step} totalSteps={steps.length} steps={steps} />
      <WizardStepHero stepDef={currentStepDef} currentStep={step} totalSteps={steps.length} />
      <p className="wizard-autosave-hint">{t("wizard.autoSave")}</p>
      <div className={`wizard-scroll wizard-step-panel wizard-step-panel--${stepType}`} key={step}>
        {renderStep()}
      </div>

      {!isSummary && (
        <div className="wizard-footer">
          <div className="flex justify-between wizard-footer-actions gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className="text-sm text-xdj-muted hover:text-xdj-text disabled:opacity-30 disabled:cursor-not-allowed font-bold min-h-[44px] px-4"
            >
              {t("wizard.back")}
            </button>
            <div className="flex gap-3 wizard-footer-actions">
              <button
                type="button"
                onClick={handleSaveAndExit}
                disabled={saving}
                className="text-sm text-xdj-gold hover:text-xdj-cyan font-bold min-h-[44px] px-4 disabled:opacity-40"
              >
                {saving ? t("common.saving") : t("wizard.saveExit")}
              </button>
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-xdj-muted hover:text-xdj-cyan font-bold min-h-[44px] px-4"
              >
                {t("wizard.skipAll")}
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance()}
                className="btn-luxury-primary px-6 py-2 rounded-sm text-sm disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
              >
                {t("wizard.next")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
