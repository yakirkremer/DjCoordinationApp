import { DEFAULT_WEDDING_TIMELINE } from "./weddingTimeline.js";

export const QUESTION_TYPES = [
  { id: "text", label: "טקסט קצר" },
  { id: "textarea", label: "טקסט ארוך" },
  { id: "date", label: "תאריך" },
  { id: "select", label: "בחירה מרשימה" },
];

export function generateQuestionId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function generateStepId() {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export const DEFAULT_FORM_SCHEMA = {
  version: 1,
  steps: [
    {
      id: "event-details",
      stepType: "questions",
      title: "פרטי האירוע",
      description: "ספרו לנו מתי ואיפה האירוע שלכם — זה עוזר לדיג'יי להתכונן מראש.",
      questions: [
        {
          id: "eventDate",
          type: "date",
          label: "תאריך האירוע",
          required: true,
          audience: "all",
          fieldKey: "eventDate",
        },
        {
          id: "eventLocation",
          type: "text",
          label: "מיקום האירוע",
          required: true,
          audience: "all",
          fieldKey: "eventLocation",
          placeholder: "שם האולם, עיר...",
        },
      ],
    },
    {
      id: "timeline",
      stepType: "timeline",
      title: "לוח זמנים",
      description: "עדכנו את לוח הזמנים של האירוע והוסיפו אבני דרך משלכם.",
      audience: "full-wedding",
      timelineItems: DEFAULT_WEDDING_TIMELINE.map((item) => ({ ...item })),
      questions: [],
    },
    {
      id: "genres",
      stepType: "genres",
      title: "סגנונות מוזיקה",
      description: "סמנו קטגוריות ודרגו כל סגנון מ-1 עד 5 כוכבים.",
      questions: [],
    },
    {
      id: "energy",
      stepType: "energy",
      title: "רמת אנרגיה",
      description: "בחרו את האווירה הכללית של האירוע.",
      questions: [],
    },
    {
      id: "phases",
      stepType: "phases",
      title: "שלבי האירוע",
      description: "לכל שלב באירוע, בחרו אילו סגנונות מתאימים.",
      questions: [],
    },
    {
      id: "playlists",
      stepType: "playlists",
      title: "רשימות והערות",
      description: "ספרו לדיג'יי מה חובה לנגן ומה להימנע ממנו.",
      questions: [],
    },
    {
      id: "summary",
      stepType: "summary",
      title: "סיכום",
      description: "בדקו שהכל נכון לפני שממשיכים לדירוג השירים.",
      questions: [],
    },
  ],
};

export function isCustomStep(step) {
  return step.stepType === "questions" && step.id !== "event-details";
}

export function canDeleteStep(step) {
  return step?.stepType !== "summary";
}
