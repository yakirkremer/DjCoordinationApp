import React from "react";
import { generateTimelineItemId, sortTimelineItems } from "../lib/weddingTimeline";

function AdminTimelineItemEditor({ item, onUpdate, onDelete }) {
  return (
    <div className="bg-[#0a0a0c] border border-xdj-border rounded-sm p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center gap-2">
        <span className="font-lcd text-[9px] text-xdj-muted uppercase">ברירת מחדל</span>
        <button
          type="button"
          onClick={onDelete}
          className="text-xdj-muted hover:text-xdj-orange text-xs"
        >
          מחק
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-xdj-muted">שעה</span>
          <input
            type="time"
            value={item.time}
            onChange={(e) => onUpdate({ time: e.target.value })}
            className="input-luxury px-3 py-2 text-sm rounded-sm"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-[10px] text-xdj-muted">שם האירוע</span>
          <input
            type="text"
            value={item.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="input-luxury px-3 py-2 text-sm rounded-sm"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-xdj-muted">הערות ברירת מחדל (אופציונלי)</span>
        <input
          type="text"
          value={item.notes ?? ""}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          className="input-luxury px-3 py-2 text-sm rounded-sm"
        />
      </label>
    </div>
  );
}

export default function FormTimelineEditor({ items = [], onAdd, onUpdate, onDelete }) {
  const sorted = sortTimelineItems(items);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <p className="font-lcd text-[10px] text-xdj-cyan uppercase">לוח זמנים — ברירת מחדל לחתונה מלאה</p>
        <button type="button" onClick={onAdd} className="chip-xdj text-[10px]">
          + אירוע
        </button>
      </div>
      <p className="text-xs text-xdj-muted">
        זהו לוח הזמנים שיופיע לזוגות מסוג &quot;חתונה מלאה&quot;. הם יוכלו לערוך ולהוסיף אירועים משלהם.
      </p>
      {sorted.length === 0 ? (
        <p className="text-xs text-xdj-muted">אין פריטים — הוסף אירועי ברירת מחדל.</p>
      ) : (
        sorted.map((item) => (
          <AdminTimelineItemEditor
            key={item.id}
            item={item}
            onUpdate={(patch) => onUpdate(item.id, patch)}
            onDelete={() => onDelete(item.id)}
          />
        ))
      )}
    </div>
  );
}

export { generateTimelineItemId };
