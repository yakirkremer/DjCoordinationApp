import { normalizeClientType } from "./clientTypes";

export const AUDIENCE_OPTIONS = [
  { id: "all", label: "כל סוגי הלקוחות" },
  { id: "full-wedding", label: "חתונה מלאה בלבד" },
  { id: "after", label: "אפטר בלבד" },
];

export function isForClientType(item, clientType) {
  const audience = item?.audience ?? "all";
  if (audience === "all") return true;
  return audience === normalizeClientType(clientType);
}

export function filterStepsForClientType(steps, clientType) {
  const type = normalizeClientType(clientType);

  return steps
    .map((step) => {
      if (!isForClientType(step, type)) return null;

      if (step.stepType === "questions") {
        const questions = step.questions.filter((q) => isForClientType(q, type));
        if (questions.length === 0) return null;
        return { ...step, questions };
      }

      return step;
    })
    .filter(Boolean);
}

export function getAudienceLabel(audience) {
  return AUDIENCE_OPTIONS.find((o) => o.id === (audience ?? "all"))?.label ?? "כל סוגי הלקוחות";
}
