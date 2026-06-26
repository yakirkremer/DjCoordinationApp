import React from "react";
import { ENERGY_LEVELS, EVENT_PHASES } from "../lib/preferences";
import { getFieldValue } from "../lib/formAnswers";
import { filterStepsForClientType } from "../lib/formFilter";
import { getClientTypeLabel } from "../lib/clientTypes";

export default function ClientPreferencesSummary({ preferences, formSchema, clientType }) {
  if (!preferences) return null;

  const energy = ENERGY_LEVELS.find((l) => l.id === preferences.energyLevel);
  const questionSteps = filterStepsForClientType(
    (formSchema?.steps ?? []).filter((s) => s.stepType === "questions"),
    clientType
  );

  return (
    <section className="panel-luxury rounded-sm p-6" dir="rtl">
      <h3 className="text-lg font-bold text-xdj-text mb-4">העדפות האירוע</h3>

      <div className="flex flex-wrap gap-3 mb-4">
        {clientType && (
          <span className="text-xs bg-purple-950/50 border border-purple-800 rounded-sm px-3 py-1 text-purple-300 font-bold">
            {getClientTypeLabel(clientType)}
          </span>
        )}
        {preferences.eventDate && (
          <span className="text-xs bg-[#0a0a0c] border border-xdj-border rounded-sm px-3 py-1 text-xdj-muted font-lcd">
            {preferences.eventDate}
          </span>
        )}
        {preferences.eventLocation?.trim() && (
          <span className="text-xs bg-[#0a0a0c] border border-xdj-border rounded-sm px-3 py-1 text-xdj-text">
            📍 {preferences.eventLocation}
          </span>
        )}
        <span className="text-xs bg-xdj-cyan/10 border border-xdj-cyan/30 rounded-sm px-3 py-1 text-xdj-cyan font-bold">
          אנרגיה: {energy?.label ?? "—"}
        </span>
        {!preferences.wizardCompleted && (
          <span className="text-xs bg-amber-950/50 border border-amber-800 rounded-sm px-3 py-1 text-amber-400">
            הטופס לא הושלם
          </span>
        )}
      </div>

      {questionSteps.some((s) =>
        s.questions.some((q) => {
          const v = getFieldValue(preferences, q);
          return v && !["eventDate", "eventLocation"].includes(q.fieldKey);
        })
      ) && (
        <div className="mb-4 flex flex-col gap-2">
          <p className="font-lcd text-[10px] text-xdj-cyan uppercase">שאלות מותאמות</p>
          {questionSteps.flatMap((step) =>
            step.questions
              .filter((q) => !["eventDate", "eventLocation"].includes(q.fieldKey))
              .map((q) => {
                const val = getFieldValue(preferences, q);
                if (!String(val).trim()) return null;
                return (
                  <div key={q.id} className="text-sm">
                    <span className="text-xdj-muted">{q.label}: </span>
                    <span className="text-xdj-text">{val}</span>
                  </div>
                );
              })
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {EVENT_PHASES.map((phase) => {
          const genres = preferences.phases?.[phase.id] ?? [];
          return (
            <div key={phase.id} className="bg-[#0a0a0c] border border-xdj-border rounded-sm p-3">
              <p className="text-xs text-xdj-muted mb-1">{phase.label}</p>
              <p className="text-sm text-xdj-text">
                {genres.length > 0 ? genres.join(", ") : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {preferences.mustPlay?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-xdj-muted mb-1">חובה לנגן</p>
          <p className="text-sm text-green-400">{preferences.mustPlay.join(" • ")}</p>
        </div>
      )}

      {preferences.doNotPlay?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-xdj-muted mb-1">לא לנגן</p>
          <p className="text-sm text-red-400">{preferences.doNotPlay.join(" • ")}</p>
        </div>
      )}

      {preferences.djNotes && (
        <div>
          <p className="text-xs text-xdj-muted mb-1">הערות לדיג'יי</p>
          <p className="text-sm text-xdj-text italic">{preferences.djNotes}</p>
        </div>
      )}
    </section>
  );
}
