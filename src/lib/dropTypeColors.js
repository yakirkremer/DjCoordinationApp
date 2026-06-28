/** Unique colors per drop type — fixed for defaults, stable hash for custom types. */
const KNOWN_DROP_COLORS = {
  dance: {
    bg: "rgba(244, 114, 182, 0.18)",
    border: "#f472b6",
    text: "#fbcfe8",
    glow: "rgba(244, 114, 182, 0.35)",
  },
  house: {
    bg: "rgba(251, 146, 60, 0.18)",
    border: "#fb923c",
    text: "#fed7aa",
    glow: "rgba(251, 146, 60, 0.35)",
  },
  techno: {
    bg: "rgba(34, 211, 238, 0.18)",
    border: "#22d3ee",
    text: "#a5f3fc",
    glow: "rgba(34, 211, 238, 0.35)",
  },
  trance: {
    bg: "rgba(167, 139, 250, 0.18)",
    border: "#a78bfa",
    text: "#ddd6fe",
    glow: "rgba(167, 139, 250, 0.35)",
  },
};

const EXTRA_DROP_COLORS = [
  { bg: "rgba(74, 222, 128, 0.18)", border: "#4ade80", text: "#bbf7d0", glow: "rgba(74, 222, 128, 0.35)" },
  { bg: "rgba(250, 204, 21, 0.18)", border: "#facc15", text: "#fef08a", glow: "rgba(250, 204, 21, 0.35)" },
  { bg: "rgba(248, 113, 113, 0.18)", border: "#f87171", text: "#fecaca", glow: "rgba(248, 113, 113, 0.35)" },
  { bg: "rgba(96, 165, 250, 0.18)", border: "#60a5fa", text: "#bfdbfe", glow: "rgba(96, 165, 250, 0.35)" },
  { bg: "rgba(45, 212, 191, 0.18)", border: "#2dd4bf", text: "#99f6e4", glow: "rgba(45, 212, 191, 0.35)" },
  { bg: "rgba(232, 121, 249, 0.18)", border: "#e879f9", text: "#f5d0fe", glow: "rgba(232, 121, 249, 0.35)" },
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

export function getDropTypeColors(drop) {
  const key = String(drop ?? "").trim().toLowerCase();
  if (!key) return NEUTRAL_DROP_COLOR;
  if (KNOWN_DROP_COLORS[key]) return KNOWN_DROP_COLORS[key];
  return EXTRA_DROP_COLORS[hashDropName(key) % EXTRA_DROP_COLORS.length];
}

export function getDropTypeStyle(drop) {
  const colors = getDropTypeColors(drop);
  return {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    color: colors.text,
    boxShadow: `0 0 0 1px ${colors.glow}`,
  };
}

export function getDropTypeCssVars(drop) {
  const colors = getDropTypeColors(drop);
  return {
    "--drop-bg": colors.bg,
    "--drop-border": colors.border,
    "--drop-text": colors.text,
    "--drop-glow": colors.glow,
  };
}
