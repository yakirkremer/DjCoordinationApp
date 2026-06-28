import React, { useEffect, useMemo } from "react";
import {
  generateTimelineItemId,
  mergeWeddingTimeline,
  normalizeTimelineItem,
  sortTimelineItems,
} from "../lib/weddingTimeline";

function TimelineRow({ item, onChange, onDelete, canDelete }) {
  return (
    <div className="wedding-timeline-row">
      <input
        type="time"
        value={item.time}
        onChange={(e) => onChange({ time: e.target.value })}
        className="input-luxury wedding-timeline-time px-2 py-2 text-sm rounded-sm min-h-[44px]"
      />
      <input
        type="text"
        value={item.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="שם האירוע"
        className="input-luxury flex-1 px-3 py-2 text-sm rounded-sm min-h-[44px]"
      />
      <input
        type="text"
        value={item.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="הערות (אופציונלי)"
        className="input-luxury flex-1 px-3 py-2 text-sm rounded-sm min-h-[44px] hidden sm:block"
      />
      {canDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-xdj-orange hover:text-red-300 px-2 min-h-[44px]"
          title="מחק"
        >
          מחק
        </button>
      ) : (
        <span className="w-10" />
      )}
    </div>
  );
}

export default function WizardStepTimeline({
  preferences,
  templateItems = [],
  onUpdatePreferences,
  title = "לוח זמנים",
  description = "עדכנו את לוח הזמנים והוסיפו אבני דרך.",
}) {
  useEffect(() => {
    if (preferences.weddingTimeline?.length) return;
    const seeded = mergeWeddingTimeline([], templateItems);
    if (seeded.length) {
      onUpdatePreferences({ weddingTimeline: seeded });
    }
  }, [preferences.weddingTimeline, templateItems, onUpdatePreferences]);

  const items = useMemo(
    () => sortTimelineItems(preferences.weddingTimeline ?? []),
    [preferences.weddingTimeline]
  );

  const updateItem = (id, patch) => {
    const next = (preferences.weddingTimeline ?? []).map((item) =>
      item.id === id ? normalizeTimelineItem({ ...item, ...patch }) : item
    );
    onUpdatePreferences({ weddingTimeline: sortTimelineItems(next) });
  };

  const addItem = () => {
    const next = [
      ...(preferences.weddingTimeline ?? []),
      normalizeTimelineItem({
        id: generateTimelineItemId(),
        time: "",
        label: "",
        notes: "",
        custom: true,
      }),
    ];
    onUpdatePreferences({ weddingTimeline: next });
  };

  const deleteItem = (id) => {
    onUpdatePreferences({
      weddingTimeline: (preferences.weddingTimeline ?? []).filter((item) => item.id !== id),
    });
  };

  return (
    <div className="flex flex-col gap-5" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-xdj-text mb-2">{title}</h2>
        <p className="text-xs text-xdj-muted">{description}</p>
      </div>

      <div className="wedding-timeline">
        <div className="wedding-timeline-header hidden sm:grid">
          <span>שעה</span>
          <span>אירוע</span>
          <span>הערות</span>
          <span />
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-xdj-muted text-center py-4">אין פריטים בלוח הזמנים</p>
        ) : (
          items.map((item) => (
            <TimelineRow
              key={item.id}
              item={item}
              onChange={(patch) => updateItem(item.id, patch)}
              onDelete={() => deleteItem(item.id)}
              canDelete={items.length > 1}
            />
          ))
        )}
      </div>

      <button type="button" onClick={addItem} className="btn-luxury-primary self-start px-4 py-2 rounded-sm text-sm min-h-[44px]">
        + הוסף אירוע ללוח הזמנים
      </button>
    </div>
  );
}
