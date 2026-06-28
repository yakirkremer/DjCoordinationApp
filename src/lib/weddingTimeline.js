export function generateTimelineItemId() {
  return `tl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export const DEFAULT_WEDDING_TIMELINE = [
  { id: "tl_guests", time: "17:00", label: "הגעת אורחים", notes: "" },
  { id: "tl_reception", time: "18:00", label: "קבלת פנים", notes: "" },
  { id: "tl_ceremony", time: "19:30", label: "חופה", notes: "" },
  { id: "tl_dinner", time: "20:30", label: "ארוחה", notes: "" },
  { id: "tl_dancing", time: "22:00", label: "ריקודים", notes: "" },
  { id: "tl_after", time: "00:00", label: "אפטר", notes: "" },
];

export function normalizeTimelineItem(item) {
  return {
    id: item?.id || generateTimelineItemId(),
    time: String(item?.time ?? "").trim(),
    label: String(item?.label ?? "").trim(),
    notes: String(item?.notes ?? "").trim(),
    custom: Boolean(item?.custom),
  };
}

export function timelineFromTemplate(templateItems = []) {
  return templateItems.map((item) =>
    normalizeTimelineItem({ ...item, custom: false })
  );
}

export function sortTimelineItems(items) {
  return [...items].sort((a, b) => {
    const ta = a.time || "99:99";
    const tb = b.time || "99:99";
    return ta.localeCompare(tb);
  });
}

export function mergeWeddingTimeline(saved, templateItems) {
  if (Array.isArray(saved) && saved.length > 0) {
    return saved.map(normalizeTimelineItem);
  }
  return timelineFromTemplate(templateItems);
}
