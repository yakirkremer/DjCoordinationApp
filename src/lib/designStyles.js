export const PLAYER_STYLES = [
  {
    id: "xdj-deck",
    nameHe: "דק DJ מלא",
    nameEn: "Full DJ deck",
    descHe: "ג'וג ויל, גל קול גדול ופאנל תחבורה — כמו XDJ",
    descEn: "Jog wheel, large waveform, transport panel — classic deck",
    preview: "deck",
  },
  {
    id: "minimal-bar",
    nameHe: "פס מינימלי",
    nameEn: "Minimal bar",
    descHe: "פס תחתון דק — גל קול ונגן בלבד",
    descEn: "Slim bottom strip — waveform and play only",
    preview: "bar",
  },
  {
    id: "vinyl-focus",
    nameHe: "ויניל מרכזי",
    nameEn: "Vinyl focus",
    descHe: "תקליט גדול במרכז, גל קול מתחת",
    descEn: "Large vinyl in center, waveform below",
    preview: "vinyl",
  },
  {
    id: "broadcast",
    nameHe: "שידור / רדיו",
    nameEn: "Broadcast",
    descHe: "גל קול רחב, טיימר בולט — ללא ג'וג",
    descEn: "Wide waveform, bold timer — no jog wheel",
    preview: "broadcast",
  },
];

export const BROWSER_STYLES = [
  {
    id: "xdj-hardware",
    nameHe: "חומרת XDJ",
    nameEn: "XDJ hardware",
    descHe: "מסך במסגרת מתכת, כפתורי צד ותחבורה",
    descEn: "Metal faceplate, side buttons, transport",
    preview: "hardware",
  },
  {
    id: "flat-list",
    nameHe: "רשימה שטוחה",
    nameEn: "Flat list",
    descHe: "טבלה נקייה ללא מסגרת חומרה",
    descEn: "Clean table without hardware chrome",
    preview: "flat",
  },
  {
    id: "card-mosaic",
    nameHe: "כרטיסיות",
    nameEn: "Card mosaic",
    descHe: "רשת כרטיסי שירים עם תצוגה מקדימה",
    descEn: "Grid of track cards with previews",
    preview: "cards",
  },
  {
    id: "studio-dense",
    nameHe: "סטודיו צפוף",
    nameEn: "Studio dense",
    descHe: "שורות צפופות, תיקיות רחבות — סגנון Rekordbox",
    descEn: "Tight rows, wide folders — Rekordbox-like",
    preview: "dense",
  },
];

export const DEFAULT_PLAYER_STYLE_ID = "xdj-deck";
export const DEFAULT_BROWSER_STYLE_ID = "xdj-hardware";

const PLAYER_STORAGE_KEY = "kramer-player-style-v1";
const BROWSER_STORAGE_KEY = "kramer-browser-style-v1";

export function getPlayerStyleById(id) {
  return PLAYER_STYLES.find((s) => s.id === id) ?? PLAYER_STYLES[0];
}

export function getBrowserStyleById(id) {
  return BROWSER_STYLES.find((s) => s.id === id) ?? BROWSER_STYLES[0];
}

export function getStyleLabel(style, locale) {
  return locale === "he" ? style.nameHe : style.nameEn;
}

export function getStyleDesc(style, locale) {
  return locale === "he" ? style.descHe : style.descEn;
}

function readStored(key, list) {
  try {
    const value = localStorage.getItem(key);
    return list.some((s) => s.id === value) ? value : null;
  } catch {
    return null;
  }
}

function writeStored(key, id) {
  try {
    localStorage.setItem(key, id);
  } catch {
    /* ignore */
  }
}

export function readStoredPlayerStyle() {
  return readStored(PLAYER_STORAGE_KEY, PLAYER_STYLES);
}

export function readStoredBrowserStyle() {
  return readStored(BROWSER_STORAGE_KEY, BROWSER_STYLES);
}

export function applyPlayerStyle(styleId) {
  const id = getPlayerStyleById(styleId).id;
  document.documentElement.dataset.playerStyle = id;
  return id;
}

export function applyBrowserStyle(styleId) {
  const id = getBrowserStyleById(styleId).id;
  document.documentElement.dataset.browserStyle = id;
  return id;
}

export function applyDesignStyles({ playerStyle, browserStyle } = {}) {
  if (playerStyle) applyPlayerStyle(playerStyle);
  if (browserStyle) applyBrowserStyle(browserStyle);
}

export function setPersonalPlayerStyle(styleId) {
  const id = getPlayerStyleById(styleId).id;
  writeStored(PLAYER_STORAGE_KEY, id);
  applyPlayerStyle(id);
  return id;
}

export function setPersonalBrowserStyle(styleId) {
  const id = getBrowserStyleById(styleId).id;
  writeStored(BROWSER_STORAGE_KEY, id);
  applyBrowserStyle(id);
  return id;
}

export function applyAllDesign({
  theme,
  playerStyle = DEFAULT_PLAYER_STYLE_ID,
  browserStyle = DEFAULT_BROWSER_STYLE_ID,
}) {
  if (theme) {
    document.documentElement.dataset.theme = theme;
  }
  applyPlayerStyle(playerStyle);
  applyBrowserStyle(browserStyle);
}
