import React, { useState } from "react";
import { QUESTION_TYPES, canDeleteStep } from "../lib/defaultFormSchema";
import { AUDIENCE_OPTIONS } from "../lib/formFilter";
import FormTimelineEditor from "./FormTimelineEditor";

function QuestionEditor({ question, stepId, onUpdate, onDelete, canDelete }) {
  return (
    <div className="bg-[#0a0a0c] border border-xdj-border rounded-sm p-4 flex flex-col gap-3">
      <div className="flex justify-between items-start gap-2">
        <span className="font-lcd text-[9px] text-xdj-muted uppercase">{question.type}</span>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(stepId, question.id)}
            className="text-xdj-muted hover:text-xdj-orange text-xs"
          >
            מחק
          </button>
        )}
      </div>

      <input
        value={question.label}
        onChange={(e) => onUpdate(stepId, question.id, { label: e.target.value })}
        placeholder="תווית השאלה"
        className="input-luxury w-full px-3 py-2 text-sm rounded-sm"
      />

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={question.type}
          onChange={(e) => {
            const type = e.target.value;
            const patch = { type };
            if (type === "select" && !question.options?.length) {
              patch.options = ["אפשרות 1", "אפשרות 2"];
            }
            onUpdate(stepId, question.id, patch);
          }}
          className="input-luxury px-3 py-2 text-xs rounded-sm"
          disabled={Boolean(question.fieldKey && !question.fieldKey.startsWith("custom."))}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-xs text-xdj-muted cursor-pointer">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => onUpdate(stepId, question.id, { required: e.target.checked })}
            className="accent-xdj-cyan"
          />
          חובה
        </label>

        <select
          value={question.audience ?? "all"}
          onChange={(e) => onUpdate(stepId, question.id, { audience: e.target.value })}
          className="input-luxury px-3 py-2 text-xs rounded-sm"
          title="למי מיועדת השאלה"
        >
          {AUDIENCE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {(question.type === "text" || question.type === "textarea") && (
        <input
          value={question.placeholder ?? ""}
          onChange={(e) => onUpdate(stepId, question.id, { placeholder: e.target.value })}
          placeholder="Placeholder (אופציונלי)"
          className="input-luxury w-full px-3 py-2 text-xs rounded-sm"
        />
      )}

      {question.type === "select" && (
        <textarea
          value={(question.options ?? []).join("\n")}
          onChange={(e) =>
            onUpdate(stepId, question.id, {
              options: e.target.value.split("\n").filter(Boolean),
            })
          }
          rows={3}
          placeholder="אפשרות אחת בכל שורה"
          className="input-luxury w-full px-3 py-2 text-xs rounded-sm resize-none font-mono"
        />
      )}
    </div>
  );
}

export default function FormBuilder({
  schema,
  updateStep,
  addCustomStep,
  deleteStep,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  moveStep,
  restoreDefault,
  addTimelineItem,
  updateTimelineItem,
  deleteTimelineItem,
}) {
  const [activeStepId, setActiveStepId] = useState(schema.steps[0]?.id ?? "");

  const activeStep = schema.steps.find((s) => s.id === activeStepId) ?? schema.steps[0];
  const activeIdx = schema.steps.findIndex((s) => s.id === activeStep?.id);

  const handleDeleteQuestion = (stepId, questionId) => {
    const step = schema.steps.find((s) => s.id === stepId);
    const q = step?.questions.find((x) => x.id === questionId);
    if (q?.fieldKey && !q.fieldKey.startsWith("custom.")) return;
    deleteQuestion(stepId, questionId);
  };

  const handleDeleteActiveStep = () => {
    if (!activeStep || !canDeleteStep(activeStep)) return;
    if (!window.confirm(`למחוק את השלב "${activeStep.title}"?`)) return;

    const idx = schema.steps.findIndex((s) => s.id === activeStep.id);
    const remaining = schema.steps.filter((s) => s.id !== activeStep.id);
    deleteStep(activeStep.id);
    const next = remaining[Math.min(idx, remaining.length - 1)] ?? remaining[0];
    setActiveStepId(next?.id ?? "");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6" dir="rtl">
      <aside className="lg:w-56 shrink-0 flex flex-col gap-2">
        <p className="font-lcd text-[10px] tracking-widest text-xdj-cyan uppercase mb-1">
          שלבי הטופס
        </p>
        {schema.steps.map((step, idx) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveStepId(step.id)}
            className={`text-right px-3 py-2 rounded-sm text-sm border transition-all ${
              step.id === activeStepId
                ? "border-xdj-cyan bg-xdj-cyan/10 text-xdj-cyan"
                : "border-xdj-border text-xdj-muted hover:border-xdj-muted"
            }`}
          >
            {idx + 1}. {step.title}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const id = addCustomStep();
            setActiveStepId(id);
          }}
          className="btn-luxury-primary mt-2 px-3 py-2 rounded-sm text-xs"
        >
          + שלב חדש
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("לאפס את הטופס לברירת המחדל?")) restoreDefault();
          }}
          className="btn-luxury mt-1 px-3 py-2 rounded-sm text-xs text-xdj-orange"
        >
          איפוס לברירת מחדל
        </button>
      </aside>

      {activeStep && (
        <div className="flex-1 panel-luxury rounded-sm p-6 flex flex-col gap-5">
          <div className="flex flex-wrap justify-between gap-3 items-center">
            <span className="font-lcd text-[10px] text-xdj-gold uppercase">
              {activeStep.stepType}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={activeIdx <= 0 || activeStep.stepType === "summary"}
                onClick={() => moveStep(activeStep.id, -1)}
                className="btn-luxury px-2 py-1 rounded-sm text-xs disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={
                  activeIdx >= schema.steps.length - 1 || activeStep.stepType === "summary"
                }
                onClick={() => moveStep(activeStep.id, 1)}
                className="btn-luxury px-2 py-1 rounded-sm text-xs disabled:opacity-30"
              >
                ↓
              </button>
              {canDeleteStep(activeStep) && (
                <button
                  type="button"
                  onClick={handleDeleteActiveStep}
                  className="text-xs text-xdj-orange px-2 hover:underline"
                >
                  מחק שלב
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="font-lcd text-[10px] text-xdj-muted uppercase">כותרת שלב</label>
            <input
              value={activeStep.title}
              onChange={(e) => updateStep(activeStep.id, { title: e.target.value })}
              className="input-luxury w-full mt-1 px-3 py-2 rounded-sm"
              disabled={activeStep.stepType === "summary"}
            />
          </div>

          <div>
            <label className="font-lcd text-[10px] text-xdj-muted uppercase">תיאור</label>
            <textarea
              value={activeStep.description ?? ""}
              onChange={(e) => updateStep(activeStep.id, { description: e.target.value })}
              rows={2}
              className="input-luxury w-full mt-1 px-3 py-2 rounded-sm resize-none"
              disabled={activeStep.stepType === "summary"}
            />
          </div>

          {activeStep.stepType !== "questions" && activeStep.stepType !== "summary" && (
            <div>
              <label className="font-lcd text-[10px] text-xdj-muted uppercase">קהל יעד</label>
              <select
                value={activeStep.audience ?? "all"}
                onChange={(e) => updateStep(activeStep.id, { audience: e.target.value })}
                className="input-luxury w-full mt-1 px-3 py-2 rounded-sm text-sm"
              >
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeStep.stepType === "questions" && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <p className="font-lcd text-[10px] text-xdj-cyan uppercase">שאלות</p>
                {(activeStep.stepType === "questions") && (
                  <div className="flex gap-2 flex-wrap">
                    {QUESTION_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => addQuestion(activeStep.id, t.id)}
                        className="chip-xdj text-[10px]"
                      >
                        + {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {activeStep.questions.length === 0 ? (
                <p className="text-xs text-xdj-muted">אין שאלות בשלב זה.</p>
              ) : (
                activeStep.questions.map((q) => (
                  <QuestionEditor
                    key={q.id}
                    question={q}
                    stepId={activeStep.id}
                    onUpdate={updateQuestion}
                    onDelete={handleDeleteQuestion}
                    canDelete={!q.fieldKey || q.fieldKey.startsWith("custom.")}
                  />
                ))
              )}
            </div>
          )}

          {activeStep.stepType === "timeline" && (
            <FormTimelineEditor
              items={activeStep.timelineItems ?? []}
              onAdd={() => addTimelineItem(activeStep.id)}
              onUpdate={(itemId, patch) => updateTimelineItem(activeStep.id, itemId, patch)}
              onDelete={(itemId) => deleteTimelineItem(activeStep.id, itemId)}
            />
          )}

          {activeStep.stepType !== "questions" &&
            activeStep.stepType !== "summary" &&
            activeStep.stepType !== "timeline" && (
            <p className="text-xs text-xdj-muted border border-xdj-border rounded-sm p-3">
              שלב מובנה — ניתן לערוך כותרת ותיאור בלבד. התוכן נקבע אוטומטית במערכת.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
