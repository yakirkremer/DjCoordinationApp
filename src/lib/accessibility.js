export const TEXT_SIZE_OPTIONS = [
  { id: "default", scale: 1 },
  { id: "large", scale: 1.125 },
  { id: "xlarge", scale: 1.25 },
];

export const DEFAULT_A11Y_PREFERENCES = {
  textSize: "default",
  highContrast: false,
  reducedMotion: false,
  strongFocus: false,
  underlineLinks: false,
  readableText: false,
};

const STORAGE_KEY = "kramer-a11y-prefs-v1";

function normalizeTextSize(value) {
  return TEXT_SIZE_OPTIONS.some((o) => o.id === value) ? value : "default";
}

export function normalizeAccessibilityPrefs(raw = {}) {
  return {
    textSize: normalizeTextSize(raw.textSize),
    highContrast: Boolean(raw.highContrast),
    reducedMotion: Boolean(raw.reducedMotion),
    strongFocus: Boolean(raw.strongFocus),
    underlineLinks: Boolean(raw.underlineLinks),
    readableText: Boolean(raw.readableText),
  };
}

export function readStoredAccessibility() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeAccessibilityPrefs(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredAccessibility(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function applyAccessibility(prefs) {
  const normalized = normalizeAccessibilityPrefs(prefs);
  const root = document.documentElement;

  root.dataset.a11yTextSize = normalized.textSize;
  root.dataset.a11yHighContrast = normalized.highContrast ? "true" : "false";
  root.dataset.a11yReducedMotion = normalized.reducedMotion ? "true" : "false";
  root.dataset.a11yStrongFocus = normalized.strongFocus ? "true" : "false";
  root.dataset.a11yUnderlineLinks = normalized.underlineLinks ? "true" : "false";
  root.dataset.a11yReadableText = normalized.readableText ? "true" : "false";

  return normalized;
}

export function setPersonalAccessibility(patch) {
  const current = readStoredAccessibility() ?? DEFAULT_A11Y_PREFERENCES;
  const next = normalizeAccessibilityPrefs({ ...current, ...patch });
  writeStoredAccessibility(next);
  return applyAccessibility(next);
}

export function resetPersonalAccessibility() {
  writeStoredAccessibility(DEFAULT_A11Y_PREFERENCES);
  return applyAccessibility(DEFAULT_A11Y_PREFERENCES);
}
