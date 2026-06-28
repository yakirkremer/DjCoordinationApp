/** Visual identity per wizard step type — accent, icon, i18n kicker key. */
export const WIZARD_STEP_THEMES = {
  questions: {
    accent: "#c9a962",
    icon: "◆",
    kickerKey: "wizard.stepType.questions",
  },
  timeline: {
    accent: "#a78bfa",
    icon: "◇",
    kickerKey: "wizard.stepType.timeline",
  },
  genres: {
    accent: "#00c8e8",
    icon: "♪",
    kickerKey: "wizard.stepType.genres",
  },
  energy: {
    accent: "#ff6b2c",
    icon: "⚡",
    kickerKey: "wizard.stepType.energy",
  },
  phases: {
    accent: "#f472b6",
    icon: "◎",
    kickerKey: "wizard.stepType.phases",
  },
  playlists: {
    accent: "#34d399",
    icon: "≡",
    kickerKey: "wizard.stepType.playlists",
  },
  summary: {
    accent: "#c9a962",
    icon: "✓",
    kickerKey: "wizard.stepType.summary",
  },
};

const FALLBACK_THEME = {
  accent: "#6b6b78",
  icon: "•",
  kickerKey: "wizard.stepType.default",
};

export function getWizardStepTheme(stepType) {
  return WIZARD_STEP_THEMES[stepType] ?? FALLBACK_THEME;
}
