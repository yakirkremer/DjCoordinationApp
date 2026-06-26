import { useState, useEffect, useCallback, useRef } from "react";
import { loadFormSchema, saveFormSchema, resetFormSchema } from "../lib/formSchemaStorage";
import {
  generateQuestionId,
  generateStepId,
  DEFAULT_FORM_SCHEMA,
} from "../lib/defaultFormSchema";

export default function useFormSchema() {
  const [schema, setSchema] = useState(() => structuredClone(DEFAULT_FORM_SCHEMA));
  const [ready, setReady] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadFormSchema().then((data) => {
      if (!cancelled) {
        setSchema(data);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveFormSchema(schema).catch((err) => console.error("Form schema save failed:", err));
    }, 300);

    return () => clearTimeout(saveTimer.current);
  }, [schema, ready]);

  const updateStep = useCallback((stepId, patch) => {
    setSchema((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
    }));
  }, []);

  const addCustomStep = useCallback(() => {
    const step = {
      id: generateStepId(),
      stepType: "questions",
      title: "שאלות חדשות",
      description: "",
      questions: [],
    };
    setSchema((prev) => {
      const summaryIdx = prev.steps.findIndex((s) => s.stepType === "summary");
      const steps = [...prev.steps];
      steps.splice(summaryIdx === -1 ? steps.length : summaryIdx, 0, step);
      return { ...prev, steps };
    });
    return step.id;
  }, []);

  const deleteStep = useCallback((stepId) => {
    setSchema((prev) => {
      const step = prev.steps.find((s) => s.id === stepId);
      if (!step || step.stepType === "summary") return prev;
      return {
        ...prev,
        steps: prev.steps.filter((s) => s.id !== stepId),
      };
    });
  }, []);

  const addQuestion = useCallback((stepId, type = "text") => {
    const qid = generateQuestionId();
    const question = {
      id: qid,
      type,
      label: "שאלה חדשה",
      required: false,
      audience: "all",
      fieldKey: `custom.${qid}`,
      placeholder: "",
      options: type === "select" ? ["אפשרות 1", "אפשרות 2"] : undefined,
    };
    setSchema((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === stepId ? { ...s, questions: [...s.questions, question] } : s
      ),
    }));
  }, []);

  const updateQuestion = useCallback((stepId, questionId, patch) => {
    setSchema((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === stepId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === questionId ? { ...q, ...patch } : q
              ),
            }
          : s
      ),
    }));
  }, []);

  const deleteQuestion = useCallback((stepId, questionId) => {
    setSchema((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === stepId
          ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) }
          : s
      ),
    }));
  }, []);

  const moveStep = useCallback((stepId, direction) => {
    setSchema((prev) => {
      const idx = prev.steps.findIndex((s) => s.id === stepId);
      const step = prev.steps[idx];
      if (idx < 0) return prev;
      if (step.stepType === "summary") return prev;

      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= prev.steps.length) return prev;
      if (prev.steps[targetIdx].stepType === "summary" && direction === 1) return prev;

      const steps = [...prev.steps];
      [steps[idx], steps[targetIdx]] = [steps[targetIdx], steps[idx]];
      return { ...prev, steps };
    });
  }, []);

  const restoreDefault = useCallback(async () => {
    const fresh = await resetFormSchema();
    setSchema(fresh);
    return fresh;
  }, []);

  return {
    schema,
    ready,
    updateStep,
    addCustomStep,
    deleteStep,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    moveStep,
    restoreDefault,
    defaultSchema: DEFAULT_FORM_SCHEMA,
  };
}
