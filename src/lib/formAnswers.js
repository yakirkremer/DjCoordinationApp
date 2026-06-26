export function getFieldValue(preferences, question) {
  const key = question.fieldKey || `custom.${question.id}`;
  if (key.startsWith("custom.")) {
    return preferences.customAnswers?.[key] ?? "";
  }
  return preferences[key] ?? "";
}

export function setFieldValue(preferences, question, value) {
  const key = question.fieldKey || `custom.${question.id}`;
  if (key.startsWith("custom.")) {
    return {
      customAnswers: {
        ...preferences.customAnswers,
        [key]: value,
      },
    };
  }
  return { [key]: value };
}

export function isQuestionAnswered(preferences, question) {
  const val = getFieldValue(preferences, question);
  return Boolean(String(val).trim());
}

export function validateQuestionsStep(preferences, questions) {
  return questions
    .filter((q) => q.required)
    .every((q) => isQuestionAnswered(preferences, q));
}
