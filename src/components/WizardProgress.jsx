import React from "react";

export default function WizardProgress({ currentStep, totalSteps, stepLabels = [] }) {
  const label = stepLabels[currentStep] ?? `שלב ${currentStep + 1}`;

  return (
    <div className="mb-8" dir="rtl">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-xdj-muted">
          שלב {currentStep + 1} מתוך {totalSteps}
        </span>
        <span className="text-xs text-xdj-cyan font-bold font-lcd tracking-wider">{label}</span>
      </div>
      <div className="flex gap-2 mb-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-sm transition-all ${
              i <= currentStep ? "bg-xdj-cyan" : "bg-xdj-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
