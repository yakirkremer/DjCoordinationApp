/** Registered themes — add entries here and matching CSS in index.css (search "Site themes"). */
export const THEMES = [
  {
    id: "xdj-dark",
    nameHe: "XDJ כהה",
    nameEn: "XDJ Dark",
    preview: ["#050505", "#00c8e8", "#c9a962"],
  },
  {
    id: "rekordbox",
    nameHe: "Rekordbox",
    nameEn: "Rekordbox",
    preview: ["#0a0a0a", "#ff5500", "#2d9cff"],
  },
  {
    id: "wedding-classic",
    nameHe: "חתונה קלאסית",
    nameEn: "Wedding Classic",
    preview: ["#1a1410", "#d4a574", "#f5e6d3"],
  },
  {
    id: "midnight",
    nameHe: "חצות כחול",
    nameEn: "Midnight Blue",
    preview: ["#060810", "#4d9fff", "#8b9dc3"],
  },
  {
    id: "neon-club",
    nameHe: "מועדון ניאון",
    nameEn: "Neon Club",
    preview: ["#08000f", "#ff2bd6", "#00f5ff"],
  },
  {
    id: "rose-garden",
    nameHe: "גן ורדים",
    nameEn: "Rose Garden",
    preview: ["#1a1014", "#e8a0b4", "#f4d4dc"],
  },
  {
    id: "forest",
    nameHe: "יער עמוק",
    nameEn: "Deep Forest",
    preview: ["#0a120e", "#3d9970", "#c9a962"],
  },
  {
    id: "minimal-light",
    nameHe: "מינימל בהיר",
    nameEn: "Minimal Light",
    preview: ["#f5f5f7", "#007aff", "#86868b"],
  },
];

export const DEFAULT_THEME_ID = "xdj-dark";
const STORAGE_KEY = "kramer-music-theme-v1";

export function getThemeById(id) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function readStoredTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return THEMES.some((t) => t.id === value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(themeId) {
  const id = getThemeById(themeId).id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore quota */
  }
  return id;
}

export function applyTheme(themeId) {
  const id = getThemeById(themeId).id;
  document.documentElement.dataset.theme = id;
  return id;
}

export function setPersonalTheme(themeId) {
  const id = writeStoredTheme(themeId);
  applyTheme(id);
  return id;
}

export function getThemeLabel(theme, locale) {
  return locale === "he" ? theme.nameHe : theme.nameEn;
}
