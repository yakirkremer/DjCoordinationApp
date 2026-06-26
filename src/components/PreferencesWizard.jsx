import React, { useState, useMemo } from "react";
import WizardProgress from "./WizardProgress";
import DynamicWizardStep from "./DynamicWizardStep";
import WizardStepGenres from "./WizardStepGenres";
import WizardStepEnergy from "./WizardStepEnergy";
import WizardStepPhases from "./WizardStepPhases";
import WizardStepPlaylists from "./WizardStepPlaylists";
import WizardStepSummary from "./WizardStepSummary";
import { validateQuestionsStep } from "../lib/formAnswers";
import { filterStepsForClientType } from "../lib/formFilter";

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
}) {
  const steps = useMemo(
    () => filterStepsForClientType(formSchema?.steps ?? [], clientType),
    [formSchema, clientType]
  );
  const [step, setStep] = useState(0);
  const currentStepDef = steps[step];

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
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const stepLabels = steps.map((s) => s.title);

  const renderStep = () => {
    if (!currentStepDef) return null;

    switch (currentStepDef.stepType) {
      case "questions":
        return (
          <DynamicWizardStep
            step={currentStepDef}
            preferences={preferences}
            onUpdatePreferences={onUpdatePreferences}
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
          />
        );
      case "energy":
        return (
          <WizardStepEnergy
            energyLevel={preferences.energyLevel}
            onSelect={(id) => onUpdatePreferences({ energyLevel: id })}
            title={currentStepDef.title}
            description={currentStepDef.description}
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
          />
        );
      default:
        return null;
    }
  };

  const isSummary = currentStepDef?.stepType === "summary";

  return (
    <section className="panel-luxury rounded-sm p-4 sm:p-8 wizard-shell" dir="rtl">
      <WizardProgress currentStep={step} totalSteps={steps.length} stepLabels={stepLabels} />
      <div className="wizard-scroll">{renderStep()}</div>

      {!isSummary && (
        <div className="wizard-footer">
          <div className="flex justify-between wizard-footer-actions gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className="text-sm text-xdj-muted hover:text-xdj-text disabled:opacity-30 disabled:cursor-not-allowed font-bold min-h-[44px] px-4"
            >
              → חזרה
            </button>
            <div className="flex gap-3 wizard-footer-actions">
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-xdj-muted hover:text-xdj-cyan font-bold min-h-[44px] px-4"
              >
                דלג הכל
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance()}
                className="btn-luxury-primary px-6 py-2 rounded-sm text-sm disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
              >
                המשך ←
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
