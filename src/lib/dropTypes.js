/** Default drop types for track versions (admin-editable in Settings). */
export const DEFAULT_DROP_TYPES = ["Dance", "House", "Techno", "Trance"];

export function normalizeDropTypes(list) {
  if (!Array.isArray(list) || list.length === 0) return [...DEFAULT_DROP_TYPES];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const label = String(item ?? "").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out.length > 0 ? out : [...DEFAULT_DROP_TYPES];
}
