import React from "react";

export default function WizardStepWelcome({ preferences, onUpdate }) {
  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-xdj-text mb-2">פרטי האירוע</h2>
        <p className="text-sm text-xdj-muted leading-relaxed">
          ספרו לנו מתי ואיפה האירוע שלכם — זה עוזר לדיג'יי להתכונן מראש.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block font-lcd text-[10px] tracking-widest text-xdj-cyan uppercase mb-2">
            תאריך האירוע *
          </label>
          <input
            type="date"
            value={preferences.eventDate}
            onChange={(e) => onUpdate({ eventDate: e.target.value })}
            className="input-luxury w-full px-4 py-3 text-xdj-text rounded-sm"
            required
          />
        </div>

        <div>
          <label className="block font-lcd text-[10px] tracking-widest text-xdj-cyan uppercase mb-2">
            מיקום האירוע *
          </label>
          <input
            type="text"
            value={preferences.eventLocation}
            onChange={(e) => onUpdate({ eventLocation: e.target.value })}
            placeholder="שם האולם, עיר..."
            className="input-luxury w-full px-4 py-3 text-xdj-text rounded-sm placeholder:text-xdj-muted/50"
            required
          />
        </div>
      </div>

      {(!preferences.eventDate || !preferences.eventLocation?.trim()) && (
        <p className="text-xs text-xdj-orange">יש למלא תאריך ומיקום כדי להמשיך.</p>
      )}
    </div>
  );
}
