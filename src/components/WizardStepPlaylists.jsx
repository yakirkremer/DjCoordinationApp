import React, { useState } from "react";

function TagListInput({ label, description, items, onAdd, onRemove, placeholder }) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput("");
  };

  return (
    <div>
      <label className="block text-sm font-bold text-gray-200 mb-1">{label}</label>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          placeholder={placeholder}
          className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-purple-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0"
        >
          הוסף
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-xs text-gray-300"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-gray-500 hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WizardStepPlaylists({ mustPlay, doNotPlay, djNotes, onUpdate, title, description }) {
  return (
    <div className="flex flex-col gap-8" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-xdj-text mb-2">{title ?? "רשימות שירים והערות"}</h2>
        <p className="text-xs text-xdj-muted">{description ?? "ספרו לדיג'יי מה חובה לנגן ומה להימנע ממנו."}</p>
      </div>

      <TagListInput
        label="חובה לנגן"
        description="שירים או אמנים שהחתן/החתנה חייבים לשמוע"
        items={mustPlay}
        placeholder='לדוגמה: "שיר כניסה - אביב גפן"'
        onAdd={(item) => onUpdate({ mustPlay: [...mustPlay, item] })}
        onRemove={(i) => onUpdate({ mustPlay: mustPlay.filter((_, idx) => idx !== i) })}
      />

      <TagListInput
        label="לא לנגן"
        description="שירים או סגנונות שאסור לנגן באירוע"
        items={doNotPlay}
        placeholder='לדוגמה: "כל שיר של..."'
        onAdd={(item) => onUpdate({ doNotPlay: [...doNotPlay, item] })}
        onRemove={(i) => onUpdate({ doNotPlay: doNotPlay.filter((_, idx) => idx !== i) })}
      />

      <div>
        <label className="block text-sm font-bold text-gray-200 mb-2">הערות חופשיות לדיג'יי</label>
        <textarea
          value={djNotes}
          onChange={(e) => onUpdate({ djNotes: e.target.value })}
          rows={4}
          placeholder="כל דבר נוסף שחשוב לכם שהדיג'יי יידע..."
          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 outline-none focus:border-purple-500 resize-none"
        />
      </div>
    </div>
  );
}
