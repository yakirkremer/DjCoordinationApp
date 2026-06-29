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
const BASE_FONT_PX = 16;

const HIGH_CONTRAST_VARS = {
  "--color-xdj-text": "#ffffff",
  "--color-xdj-muted": "#d8d8e4",
  "--color-xdj-border": "#9a9ab0",
  "--color-xdj-cyan": "#66e8ff",
  "--color-xdj-gold": "#ffd966",
  "--color-xdj-orange": "#ff8844",
  "--theme-accent": "#ffcc44",
  "--theme-accent-secondary": "#66ddff",
  "--theme-wave-played": "#88ccff",
  "--theme-wave-unplayed": "#4a4a5c",
  "--color-artist-text": "#99eeff",
};

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

function textScaleForSize(textSize) {
  return TEXT_SIZE_OPTIONS.find((o) => o.id === textSize)?.scale ?? 1;
}

function applyTextSize(root, textSize) {
  const scale = textScaleForSize(textSize);
  root.style.setProperty("--a11y-font-scale", String(scale));
  if (scale === 1) {
    root.style.removeProperty("font-size");
  } else {
    root.style.setProperty("font-size", `${BASE_FONT_PX * scale}px`);
  }
}

function applyHighContrast(root, enabled) {
  for (const key of Object.keys(HIGH_CONTRAST_VARS)) {
    if (enabled) {
      root.style.setProperty(key, HIGH_CONTRAST_VARS[key]);
    } else {
      root.style.removeProperty(key);
    }
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

  applyTextSize(root, normalized.textSize);
  applyHighContrast(root, normalized.highContrast);

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
