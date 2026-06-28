/** Track browser row density — site default (admin settings). */

export const BROWSER_ROW_SIZES = [
  {
    id: "compact",
    nameHe: "צפוף",
    nameEn: "Compact",
    descHe: "שורות קטנות — יותר שירים על המסך",
    descEn: "Smaller rows — more tracks on screen",
  },
  {
    id: "default",
    nameHe: "רגיל",
    nameEn: "Default",
    descHe: "גודל מאוזן",
    descEn: "Balanced size",
  },
  {
    id: "comfortable",
    nameHe: "נוח",
    nameEn: "Comfortable",
    descHe: "שורות גבוהות יותר ותמונות ברורות",
    descEn: "Taller rows and clearer artwork",
  },
  {
    id: "large",
    nameHe: "גדול",
    nameEn: "Large",
    descHe: "שורות גדולות — קל לקריאה ולמגע",
    descEn: "Large rows — easy to read and tap",
  },
];

export const DEFAULT_BROWSER_ROW_SIZE_ID = "comfortable";

const STORAGE_KEY = "kramer-browser-row-size-v1";

const SIZE_VARS = {
  compact: {
    rowH: "34px",
    art: "30px",
    previewH: "22px",
    colArt: "1.875rem",
    colPreview: "5rem",
    title: "0.72rem",
    artist: "0.68rem",
    padY: "0.2rem",
    artLetter: "0.58rem",
  },
  default: {
    rowH: "42px",
    art: "36px",
    previewH: "26px",
    colArt: "2.25rem",
    colPreview: "5.75rem",
    title: "0.78rem",
    artist: "0.74rem",
    padY: "0.28rem",
    artLetter: "0.65rem",
  },
  comfortable: {
    rowH: "52px",
    art: "44px",
    previewH: "30px",
    colArt: "2.75rem",
    colPreview: "6.5rem",
    title: "0.84rem",
    artist: "0.78rem",
    padY: "0.35rem",
    artLetter: "0.75rem",
  },
  large: {
    rowH: "64px",
    art: "52px",
    previewH: "36px",
    colArt: "3.25rem",
    colPreview: "7.5rem",
    title: "0.92rem",
    artist: "0.84rem",
    padY: "0.45rem",
    artLetter: "0.85rem",
  },
};

export function getBrowserRowSizeById(id) {
  return BROWSER_ROW_SIZES.find((s) => s.id === id) ?? BROWSER_ROW_SIZES.find((s) => s.id === DEFAULT_BROWSER_ROW_SIZE_ID);
}

export function getBrowserRowSizeLabel(size, locale) {
  return locale === "he" ? size.nameHe : size.nameEn;
}

export function getBrowserRowSizeDesc(size, locale) {
  return locale === "he" ? size.descHe : size.descEn;
}

export function readStoredBrowserRowSize() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return BROWSER_ROW_SIZES.some((s) => s.id === value) ? value : null;
  } catch {
    return null;
  }
}

function varsForId(id) {
  return SIZE_VARS[getBrowserRowSizeById(id).id] ?? SIZE_VARS.comfortable;
}

export function applyBrowserRowSize(sizeId) {
  const id = getBrowserRowSizeById(sizeId).id;
  const vars = varsForId(id);
  const root = document.documentElement;

  root.dataset.browserRowSize = id;
  root.style.setProperty("--browser-row-h", vars.rowH);
  root.style.setProperty("--browser-art-size", vars.art);
  root.style.setProperty("--browser-preview-h", vars.previewH);
  root.style.setProperty("--browser-col-art-w", vars.colArt);
  root.style.setProperty("--browser-col-preview-w", vars.colPreview);
  root.style.setProperty("--browser-row-title-size", vars.title);
  root.style.setProperty("--browser-row-artist-size", vars.artist);
  root.style.setProperty("--browser-row-pad-y", vars.padY);
  root.style.setProperty("--browser-art-letter-size", vars.artLetter);

  return id;
}

export function setPersonalBrowserRowSize(styleId) {
  const id = getBrowserRowSizeById(styleId).id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  applyBrowserRowSize(id);
  return id;
}
