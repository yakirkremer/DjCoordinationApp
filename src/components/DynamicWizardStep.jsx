import React from "react";
import DynamicQuestionField from "./DynamicQuestionField";
import { setFieldValue, validateQuestionsStep } from "../lib/formAnswers";

export default function DynamicWizardStep({ step, preferences, onUpdatePreferences, hideHeader = false }) {
  const handleChange = (question, value) => {
    onUpdatePreferences(setFieldValue(preferences, question, value));
  };

  const questions = step.questions ?? [];
  const isValid = validateQuestionsStep(preferences, questions);

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      {!hideHeader && (
        <div>
          <h2 className="text-2xl font-bold text-xdj-text mb-2">{step.title}</h2>
          {step.description && (
            <p className="text-sm text-xdj-muted leading-relaxed">{step.description}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {questions.map((question) => (
          <DynamicQuestionField
            key={question.id}
            question={question}
            preferences={preferences}
            onChange={(value) => handleChange(question, value)}
          />
        ))}
      </div>

      {!isValid && (
        <p className="text-xs text-xdj-orange">יש למלא את כל השדות המסומנים ב-*</p>
      )}
    </div>
  );
}
