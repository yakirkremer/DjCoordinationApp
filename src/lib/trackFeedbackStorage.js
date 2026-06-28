import { DEFAULT_PREFERENCES, mergePreferences } from "./preferences";
import { fetchFeedback, saveFeedback as saveFeedbackApi } from "./api/dataApi";
import { migrateTrackRatings } from "./trackRating";

export function feedbackStorageKey(clientId) {
  return `kremer-music-track-feedback-v1-${clientId}`;
}

export function emptyFeedback() {
  return {
    ratings: {},
    comments: {},
    selectedCategories: [],
    categoryRatings: {},
    preferences: { ...DEFAULT_PREFERENCES },
  };
}

export function normalizeFeedback(parsed, defaultCategories) {
  if (!parsed) return emptyFeedback();
  const valid = new Set(defaultCategories);
  const selected = Array.isArray(parsed.selectedCategories)
    ? parsed.selectedCategories.filter((c) => valid.has(c))
    : [];
  const categoryRatings = { ...(parsed.categoryRatings ?? {}) };
  for (const key of Object.keys(categoryRatings)) {
    if (!valid.has(key)) delete categoryRatings[key];
  }
  return {
    ratings: migrateTrackRatings(parsed.ratings ?? {}),
    comments: parsed.comments ?? {},
    selectedCategories: selected,
    categoryRatings,
    preferences: mergePreferences(parsed.preferences),
  };
}

export async function loadFeedback(defaultCategories, clientId) {
  if (!clientId) return emptyFeedback(defaultCategories);

  try {
    const parsed = await fetchFeedback(clientId);
    return normalizeFeedback(parsed, defaultCategories);
  } catch {
    return emptyFeedback(defaultCategories);
  }
}

export async function saveFeedback(
  { ratings, comments, selectedCategories, categoryRatings, preferences },
  clientId
) {
  if (!clientId) return;

  try {
    await saveFeedbackApi(clientId, {
      ratings,
      comments,
      selectedCategories,
      categoryRatings,
      preferences,
    });
  } catch (err) {
    console.error("Failed to save track feedback:", err);
    throw err;
  }
}
