import { OFFICIAL_CATEGORIES } from "./categories";
import { getFieldValue } from "./formAnswers";
import { filterStepsForClientType } from "./formFilter";
import { getClientTypeLabel, normalizeClientType } from "./clientTypes";
import { ENERGY_LEVELS, EVENT_PHASES } from "./preferences";
import {
  getCategoryBreakdown,
  getLikedTracks,
  getTracksByCategoryRating,
} from "./feedbackAnalytics";
import { sortTimelineItems } from "./weddingTimeline";

const MAILTO_BODY_LIMIT = 1800;

function line(char = "─", width = 56) {
  return char.repeat(width);
}

function safeFilename(name) {
  return String(name || "client")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .trim()
    .slice(0, 60) || "client";
}

function formatTrackList(tracks, empty = "—") {
  if (!tracks?.length) return empty;
  return tracks
    .map((t) => {
      const base = `  • ${t.title} — ${t.artist}`;
      return t.comment ? `${base}\n    הערה: ${t.comment}` : base;
    })
    .join("\n");
}

export function buildClientReportData({ client, feedback, tracks, formSchema }) {
  const preferences = feedback?.preferences ?? {};
  const selectedCategories = feedback?.selectedCategories ?? [];
  const categoryRatings = feedback?.categoryRatings ?? {};
  const ratings = feedback?.ratings ?? {};
  const comments = feedback?.comments ?? {};

  const breakdown = getCategoryBreakdown(OFFICIAL_CATEGORIES, selectedCategories, categoryRatings);
  const likedTracks = getLikedTracks(tracks, ratings, comments);
  const categoryTracks = getTracksByCategoryRating(tracks, ratings, comments, selectedCategories);
  const energy = ENERGY_LEVELS.find((l) => l.id === preferences.energyLevel);

  const questionSteps = filterStepsForClientType(
    (formSchema?.steps ?? []).filter((s) => s.stepType === "questions"),
    client?.clientType
  );

  const customAnswers = [];
  for (const step of questionSteps) {
    for (const q of step.questions ?? []) {
      if (["eventDate", "eventLocation"].includes(q.fieldKey)) continue;
      const val = getFieldValue(preferences, q);
      if (String(val).trim()) {
        customAnswers.push({ label: q.label, value: val });
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    client: {
      name: client?.name ?? "",
      loginCode: client?.loginCode ?? "",
      type: getClientTypeLabel(client?.clientType),
      typeId: normalizeClientType(client?.clientType),
    },
    preferences,
    energyLabel: energy?.label ?? "—",
    wizardCompleted: Boolean(preferences.wizardCompleted),
    breakdown,
    likedTracks,
    categoryTracks,
    customAnswers,
    timeline: sortTimelineItems(preferences.weddingTimeline ?? []),
  };
}

export function buildClientReportText(report) {
  const lines = [];
  const push = (...parts) => lines.push(...parts);

  push("KRAMER MUSIC — דוח העדפות לקוח");
  push(line());
  push(`תאריך דוח: ${new Date(report.generatedAt).toLocaleString("he-IL")}`);
  push(`שם: ${report.client.name}`);
  push(`סוג אירוע: ${report.client.type}`);
  if (report.client.loginCode) push(`קוד כניסה: ${report.client.loginCode}`);
  push(`סטטוס טופס: ${report.wizardCompleted ? "הושלם" : "לא הושלם"}`);
  push("");

  push("═══ פרטי אירוע ═══");
  if (report.preferences.eventDate) push(`תאריך: ${report.preferences.eventDate}`);
  if (report.preferences.eventLocation?.trim()) {
    push(`מיקום: ${report.preferences.eventLocation}`);
  }
  push(`אנרגיה: ${report.energyLabel}`);
  push("");

  if (report.customAnswers.length) {
    push("═══ שאלות מותאמות ═══");
    for (const { label, value } of report.customAnswers) {
      push(`${label}: ${value}`);
    }
    push("");
  }

  if (report.client.typeId === "full-wedding" && report.timeline.length) {
    push("═══ לוח זמנים ═══");
    for (const item of report.timeline) {
      const note = item.notes ? ` — ${item.notes}` : "";
      push(`  ${item.time}  ${item.label}${note}`);
    }
    push("");
  }

  push("═══ סגנונות לפי שלבי אירוע ═══");
  for (const phase of EVENT_PHASES) {
    const genres = report.preferences.phases?.[phase.id] ?? [];
    push(`${phase.label}: ${genres.length ? genres.join(", ") : "—"}`);
  }
  push("");

  push("═══ סגנונות נבחרים ודירוג ═══");
  push(
    `נבחרו ${report.breakdown.selectedCount} מתוך ${report.breakdown.totalCount} סגנונות (${report.breakdown.percentage}%)`
  );
  for (const { category, selected, rating } of report.breakdown.categories) {
    if (!selected) continue;
    const stars = rating > 0 ? ` (${"★".repeat(rating)})` : "";
    push(`  • ${category}${stars}`);
  }
  push("");

  if (report.preferences.mustPlay?.length) {
    push("═══ חובה לנגן ═══");
    push(`  ${report.preferences.mustPlay.join(" • ")}`);
    push("");
  }

  if (report.preferences.doNotPlay?.length) {
    push("═══ לא לנגן ═══");
    push(`  ${report.preferences.doNotPlay.join(" • ")}`);
    push("");
  }

  if (report.preferences.djNotes?.trim()) {
    push("═══ הערות לדיג'יי ═══");
    push(`  ${report.preferences.djNotes.trim()}`);
    push("");
  }

  push("═══ שירים לפי סגנון ═══");
  let hasRated = false;
  for (const { category, liked, disliked } of report.categoryTracks) {
    if (!liked.length && !disliked.length) continue;
    hasRated = true;
    push(`▸ ${category}`);
    push("  אהבתי (ירוק):");
    push(formatTrackList(liked));
    push("  לא אהבתי (כתום):");
    push(formatTrackList(disliked));
    push("");
  }
  if (!hasRated) {
    push("  עדיין לא דורגו שירים");
    push("");
  }

  push("═══ סיכום ═══");
  push(`שירים שאהבו: ${report.likedTracks.length}`);
  const dislikedCount = report.categoryTracks.reduce((n, g) => n + g.disliked.length, 0);
  push(`שירים שלא אהבו: ${dislikedCount}`);
  push(line());
  push("נוצר אוטומטית ממערכת Kramer Music");

  return lines.join("\n");
}

export function buildClientReportHtml(report, textBody) {
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const categoryRows = report.categoryTracks
    .filter((g) => g.liked.length || g.disliked.length)
    .map(
      (g) => `
    <tr>
      <td><strong>${esc(g.category)}</strong></td>
      <td class="like-col">${esc(formatTrackList(g.liked).replace(/^  • /gm, "• "))}</td>
      <td class="dislike-col">${esc(formatTrackList(g.disliked).replace(/^  • /gm, "• "))}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>דוח — ${esc(report.client.name)}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #111; color: #eee; padding: 24px; line-height: 1.5; }
    h1 { color: #c9a962; font-size: 1.4rem; }
    h2 { color: #00c8e8; font-size: 1rem; margin-top: 1.5rem; border-bottom: 1px solid #333; padding-bottom: 4px; }
    .meta { color: #999; font-size: 0.9rem; }
    pre { white-space: pre-wrap; background: #1a1a1f; padding: 12px; border-radius: 6px; font-size: 0.85rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 0.85rem; }
    th, td { border: 1px solid #333; padding: 8px; vertical-align: top; text-align: right; }
    th { background: #1a1a1f; color: #00c8e8; }
    .like-col { color: #86efac; }
    .dislike-col { color: #ffb088; }
  </style>
</head>
<body>
  <h1>Kramer Music — דוח העדפות</h1>
  <p class="meta">${esc(report.client.name)} · ${esc(report.client.type)} · ${new Date(report.generatedAt).toLocaleString("he-IL")}</p>
  <pre>${esc(textBody)}</pre>
  ${categoryRows ? `<h2>שירים לפי סגנון</h2><table><thead><tr><th>סגנון</th><th>אהבתי</th><th>לא אהבתי</th></tr></thead><tbody>${categoryRows}</tbody></table>` : ""}
</body>
</html>`;
}

export function downloadReportFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportClientReportFiles({ client, feedback, tracks, formSchema }) {
  const report = buildClientReportData({ client, feedback, tracks, formSchema });
  const text = buildClientReportText(report);
  const html = buildClientReportHtml(report, text);
  const base = safeFilename(client?.name);

  return {
    report,
    text,
    html,
    txtFilename: `Kramer-${base}-report.txt`,
    htmlFilename: `Kramer-${base}-report.html`,
  };
}

export function openClientReportEmail({ client, text, to = "" }) {
  const subject = `דוח העדפות — ${client?.name ?? "לקוח"} | Kramer Music`;
  let body = text;

  if (body.length > MAILTO_BODY_LIMIT) {
    body =
      `${text.slice(0, MAILTO_BODY_LIMIT)}\n\n[... הדוח המלא ארוך מדי למייל — צרף את קובץ הדוח שהורדת (.txt) ...]`;
  }

  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", body);

  const mailto = to.trim()
    ? `mailto:${to.trim()}?${params.toString()}`
    : `mailto:?${params.toString()}`;

  window.location.href = mailto;
}
