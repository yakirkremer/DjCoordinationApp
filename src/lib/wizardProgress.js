import { isQuestionAnswered } from "./formAnswers";
import { filterStepsForClientType } from "./formFilter";

export function getStepAnsweredCount(
  preferences,
  stepDef,
  selectedCategories = [],
  categoryRatings = {}
) {
  if (!stepDef) return { answered: 0, total: 0 };

  switch (stepDef.stepType) {
    case "questions": {
      const questions = stepDef.questions ?? [];
      return {
        answered: questions.filter((q) => isQuestionAnswered(preferences, q)).length,
        total: questions.length,
      };
    }
    case "genres": {
      const rated = selectedCategories.filter((g) => (categoryRatings[g] || 0) > 0).length;
      const total = Math.max(selectedCategories.length, 1);
      return { answered: rated, total };
    }
    case "energy":
      return { answered: preferences.energyLevel ? 1 : 0, total: 1 };
    case "phases": {
      const assigned = Object.values(preferences.phases ?? {}).some((list) => list?.length > 0);
      return { answered: assigned ? 1 : 0, total: 1 };
    }
    case "timeline": {
      const items = preferences.weddingTimeline ?? [];
      const filled = items.filter((item) => String(item?.title ?? "").trim()).length;
      const total = Math.max(stepDef.timelineItems?.length ?? 1, items.length, 1);
      return { answered: filled, total };
    }
    case "playlists": {
      const lists = [
        ...(preferences.mustPlay ?? []),
        ...(preferences.doNotPlay ?? []),
      ].filter((line) => String(line).trim()).length;
      const notes = String(preferences.djNotes ?? "").trim() ? 1 : 0;
      const answered = lists + notes;
      return { answered: answered > 0 ? 1 : 0, total: 1 };
    }
    case "summary":
      return { answered: preferences.wizardCompleted ? 1 : 0, total: 1 };
    default:
      return { answered: 0, total: 0 };
  }
}

export function getWizardSteps(formSchema, clientType) {
  return filterStepsForClientType(formSchema?.steps ?? [], clientType);
}

export function getWizardCompletionPercent(
  formSchema,
  clientType,
  preferences,
  selectedCategories,
  categoryRatings
) {
  const steps = getWizardSteps(formSchema, clientType);
  if (!steps.length) return preferences.wizardCompleted ? 100 : 0;
  if (preferences.wizardCompleted) return 100;

  let score = 0;
  for (const stepDef of steps) {
    const { answered, total } = getStepAnsweredCount(
      preferences,
      stepDef,
      selectedCategories,
      categoryRatings
    );
    if (total <= 0) continue;
    score += Math.min(answered / total, 1);
  }

  return Math.round((score / steps.length) * 100);
}

export function countRatedTracks(tracks, ratings, genreTabs = []) {
  let rated = 0;
  let total = 0;

  for (const track of tracks) {
    const inScope =
      !genreTabs.length || genreTabs.includes(track.bucket);
    if (!inScope) continue;

    total += 1;
    if (ratings && ratings[track.id]) rated += 1;
  }

  return { rated, total };
}
