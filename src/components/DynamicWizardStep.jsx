import React from "react";
import DynamicQuestionField from "./DynamicQuestionField";
import { setFieldValue, validateQuestionsStep } from "../lib/formAnswers";

export default function DynamicWizardStep({ step, preferences, onUpdatePreferences }) {
  const handleChange = (question, value) => {
    onUpdatePreferences(setFieldValue(preferences, question, value));
  };

  const isValid = validateQuestionsStep(preferences, step.questions);

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-xdj-text mb-2">{step.title}</h2>
        {step.description && (
          <p className="text-sm text-xdj-muted leading-relaxed">{step.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {step.questions.map((question) => (
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
