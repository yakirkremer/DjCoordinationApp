export const ENERGY_LEVELS = [
  { id: "chill", label: "רגוע", description: "אווירה נעימה ושקטה" },
  { id: "mixed", label: "מעורב", description: "שילוב של רגוע ומסיבה" },
  { id: "party", label: "מסיבה", description: "אנרגיה גבוהה ורחבה" },
];

export const EVENT_PHASES = [
  { id: "reception", label: "קבלת פנים" },
  { id: "dancing", label: "ריקודים" },
  { id: "dessert", label: "קינוח" },
  { id: "hora", label: "הורה" },
];

export const DEFAULT_PREFERENCES = {
  wizardCompleted: false,
  wizardStep: 0,
  eventDate: "",
  eventLocation: "",
  energyLevel: "mixed",
  phases: {
    reception: [],
    dancing: [],
    dessert: [],
    hora: [],
  },
  mustPlay: [],
  doNotPlay: [],
  djNotes: "",
  customAnswers: {},
};

export function mergePreferences(saved) {
  if (!saved || typeof saved !== "object") return { ...DEFAULT_PREFERENCES };

  return {
    ...DEFAULT_PREFERENCES,
    ...saved,
    phases: {
      ...DEFAULT_PREFERENCES.phases,
      ...(saved.phases ?? {}),
    },
    mustPlay: Array.isArray(saved.mustPlay) ? saved.mustPlay : [],
    doNotPlay: Array.isArray(saved.doNotPlay) ? saved.doNotPlay : [],
    customAnswers:
      saved.customAnswers && typeof saved.customAnswers === "object"
        ? saved.customAnswers
        : {},
  };
}
