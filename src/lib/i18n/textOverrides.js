import { translations } from "./translations.js";

export const TEXT_OVERRIDE_LOCALES = ["he", "en"];

export function normalizeTextOverrides(raw) {
  const out = { he: {}, en: {} };
  if (!raw || typeof raw !== "object") return out;

  for (const locale of TEXT_OVERRIDE_LOCALES) {
    const bucket = raw[locale];
    if (!bucket || typeof bucket !== "object") continue;
    for (const [key, value] of Object.entries(bucket)) {
      if (typeof key !== "string" || !key.trim()) continue;
      if (typeof value === "string" && value.trim()) {
        out[locale][key.trim()] = value.trim();
      }
    }
  }
  return out;
}

function flattenStrings(obj, prefix = "") {
  const items = [];
  if (!obj || typeof obj !== "object") return items;

  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      items.push({ key, defaultValue: v });
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      items.push(...flattenStrings(v, key));
    }
  }
  return items;
}

export function flattenTranslationKeys(locale) {
  const root = translations[locale] ?? translations.he;
  return flattenStrings(root).sort((a, b) => a.key.localeCompare(b.key));
}

export function groupTranslationKeys(items) {
  const groups = new Map();
  for (const item of items) {
    const section = item.key.split(".")[0] || "other";
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(item);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function getEffectiveTranslation(locale, key, overrides = {}) {
  const custom = overrides[locale]?.[key];
  if (typeof custom === "string" && custom.length > 0) return custom;
  return null;
}
