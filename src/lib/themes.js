/** Registered themes — add new entries here and matching CSS in index.css. */
export const THEMES = [
  {
    id: "xdj-dark",
    nameHe: "XDJ כהה (ברירת מחדל)",
    nameEn: "XDJ Dark (default)",
    preview: ["#050505", "#00c8e8", "#c9a962"],
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
];

export const DEFAULT_THEME_ID = "xdj-dark";

export function getThemeById(id) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function applyTheme(themeId) {
  const id = getThemeById(themeId).id;
  document.documentElement.dataset.theme = id;
  return id;
}
