import { normalizeDropTypes } from "./dropTypes.js";

/** Default border colors for built-in drop types. */
export const DEFAULT_DROP_TYPE_COLOR_HEX = {
  Dance: "#f472b6",
  House: "#fb923c",
  Techno: "#22d3ee",
  Trance: "#a78bfa",
};

const FALLBACK_PALETTE_HEX = [
  "#4ade80",
  "#facc15",
  "#f87171",
  "#60a5fa",
  "#2dd4bf",
  "#e879f9",
];

const NEUTRAL_DROP_COLOR = {
  bg: "rgba(148, 163, 184, 0.12)",
  border: "#94a3b8",
  text: "#cbd5e1",
  glow: "rgba(148, 163, 184, 0.25)",
};

function hashDropName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function normalizeHex(hex) {
  const raw = String(hex ?? "").trim();
  if (!raw) return null;
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = parseInt(normalized.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function mixRgb(rgb, target, amount) {
  return {
    r: Math.round(rgb.r + (target.r - rgb.r) * amount),
    g: Math.round(rgb.g + (target.g - rgb.g) * amount),
    b: Math.round(rgb.b + (target.b - rgb.b) * amount),
  };
}

export function buildDropPalette(borderHex) {
  const border = normalizeHex(borderHex);
  const rgb = hexToRgb(border);
  if (!border || !rgb) return NEUTRAL_DROP_COLOR;

  const textRgb = mixRgb(rgb, { r: 255, g: 255, b: 255 }, 0.72);
  return {
    border,
    bg: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`,
    text: `rgb(${textRgb.r}, ${textRgb.g}, ${textRgb.b})`,
    glow: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`,
  };
}

function findColorEntry(colorMap, drop) {
  if (!colorMap || !drop) return null;
  if (colorMap[drop]) return colorMap[drop];
  const key = Object.keys(colorMap).find((k) => k.toLowerCase() === drop.toLowerCase());
  return key ? colorMap[key] : null;
}

export function getDefaultHexForDrop(drop, index = 0) {
  const label = String(drop ?? "").trim();
  if (!label) return FALLBACK_PALETTE_HEX[0];
  if (DEFAULT_DROP_TYPE_COLOR_HEX[label]) return DEFAULT_DROP_TYPE_COLOR_HEX[label];
  const builtIn = Object.entries(DEFAULT_DROP_TYPE_COLOR_HEX).find(
    ([name]) => name.toLowerCase() === label.toLowerCase()
  );
  if (builtIn) return builtIn[1];
  return FALLBACK_PALETTE_HEX[index % FALLBACK_PALETTE_HEX.length];
}

/** Ensure every drop type has a saved border hex color. */
export function normalizeDropTypeColors(dropTypes, colorMap = {}) {
  const types = normalizeDropTypes(dropTypes);
  const out = {};
  types.forEach((drop, index) => {
    const saved = normalizeHex(findColorEntry(colorMap, drop));
    out[drop] = saved || getDefaultHexForDrop(drop, index);
  });
  return out;
}

export function getDropTypeColors(drop, colorMap = {}) {
  const label = String(drop ?? "").trim();
  if (!label) return NEUTRAL_DROP_COLOR;

  const saved = normalizeHex(findColorEntry(colorMap, label));
  if (saved) return buildDropPalette(saved);

  return buildDropPalette(getDefaultHexForDrop(label, hashDropName(label)));
}

export function getDropTypeStyle(drop, colorMap = {}) {
  const colors = getDropTypeColors(drop, colorMap);
  return {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    color: colors.text,
    boxShadow: `0 0 0 1px ${colors.glow}`,
  };
}

export function getDropTypeCssVars(drop, colorMap = {}) {
  const colors = getDropTypeColors(drop, colorMap);
  return {
    "--drop-bg": colors.bg,
    "--drop-border": colors.border,
    "--drop-text": colors.text,
    "--drop-glow": colors.glow,
  };
}
