import { sortTimelineItems } from "../lib/weddingTimeline";

export default function WeddingTimelineSummary({ items, title = "לוח זמנים" }) {
  const sorted = sortTimelineItems(items ?? []).filter(
    (item) => item.label?.trim() || item.time?.trim()
  );

  if (!sorted.length) return null;

  return (
    <div>
      <p className="text-xdj-muted mb-2">{title}</p>
      <ul className="wedding-timeline-summary">
        {sorted.map((item) => (
          <li key={item.id} className="wedding-timeline-summary-item">
            <span className="wedding-timeline-summary-time">{item.time || "—"}</span>
            <div className="min-w-0">
              <p className="text-xdj-text font-medium">{item.label || "ללא שם"}</p>
              {item.notes?.trim() ? (
                <p className="text-xs text-xdj-muted mt-0.5">{item.notes}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
