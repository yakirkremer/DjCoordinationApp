/** Default music genres / catalog folders (admin-editable via Settings). */
export const DEFAULT_GENRES = [
  "Israeli",
  "Loazi",
  "Mizrahit",
  "Oldies",
  "Hip Hop",
  "Regatton",
  "Trance",
  "Techno",
  "Tomorrowland",
];

/** @deprecated Use settings.genres or useGenres() — kept for server fallbacks. */
export const OFFICIAL_CATEGORIES = DEFAULT_GENRES;

export function sanitizeGenreName(name) {
  const label = String(name ?? "")
    .trim()
    .replace(/[<>:"|?*\x00-\x1f\\/]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  if (!label) return "";
  if (label.length > 64) return label.slice(0, 64).trim();
  return label;
}

export function normalizeGenres(list) {
  if (!Array.isArray(list) || list.length === 0) return [...DEFAULT_GENRES];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const label = sanitizeGenreName(item);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out.length > 0 ? out : [...DEFAULT_GENRES];
}
