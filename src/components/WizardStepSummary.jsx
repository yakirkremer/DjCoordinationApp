import React from "react";
import { ENERGY_LEVELS, EVENT_PHASES } from "../lib/preferences";
import { getFieldValue } from "../lib/formAnswers";
import { filterStepsForClientType } from "../lib/formFilter";
import WeddingTimelineSummary from "./WeddingTimelineSummary";

export default function WizardStepSummary({
  formSchema,
  clientType,
  preferences,
  selectedCategories,
  categoryRatings = {},
  onComplete,
  onSkip,
  title = "סיכום ההעדפות שלכם",
  description = "בדקו שהכל נכון לפני שממשיכים לדירוג השירים.",
  hideHeader = false,
}) {
  const energy = ENERGY_LEVELS.find((l) => l.id === preferences.energyLevel);

  const visibleSteps = filterStepsForClientType(formSchema?.steps ?? [], clientType);
  const hasStep = (type) => visibleSteps.some((s) => s.stepType === type);

  const questionSteps = visibleSteps.filter((s) => s.stepType === "questions");

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      {!hideHeader && (
        <div>
          <h2 className="text-xl font-bold text-xdj-text mb-2">{title}</h2>
          <p className="text-xs text-xdj-muted">{description}</p>
        </div>
      )}

      <div className="bg-[#0a0a0c] border border-xdj-border rounded-sm p-5 flex flex-col gap-4 text-sm">
        {questionSteps.map((step) =>
          step.questions.map((q) => {
            const val = getFieldValue(preferences, q);
            if (!String(val).trim()) return null;
            return (
              <div key={q.id}>
                <span className="text-xdj-muted">{q.label}: </span>
                <span className="text-xdj-text">{val}</span>
              </div>
            );
          })
        )}

        {hasStep("genres") && (
        <div>
          <span className="text-xdj-muted">סגנונות: </span>
          {selectedCategories.length > 0 ? (
            <ul className="mt-1 flex flex-col gap-1">
              {selectedCategories.map((cat) => {
                const r = categoryRatings[cat] || 0;
                return (
                  <li key={cat} className="text-xdj-text text-sm">
                    {cat}
                    {r > 0 && <span className="text-xdj-gold mr-2"> {"★".repeat(r)}</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <span className="text-xdj-text">לא נבחרו</span>
          )}
        </div>
        )}

        {hasStep("energy") && (
        <div>
          <span className="text-xdj-muted">רמת אנרגיה: </span>
          <span className="text-xdj-text">{energy?.label ?? "—"}</span>
        </div>
        )}

        {hasStep("timeline") && (
          <WeddingTimelineSummary items={preferences.weddingTimeline} />
        )}

        {hasStep("phases") &&
        EVENT_PHASES.map((phase) => {
          const genres = preferences.phases[phase.id] ?? [];
          if (genres.length === 0) return null;
          return (
            <div key={phase.id}>
              <span className="text-xdj-muted">{phase.label}: </span>
              <span className="text-xdj-text">{genres.join(", ")}</span>
            </div>
          );
        })}

        {hasStep("playlists") && preferences.mustPlay.length > 0 && (
          <div>
            <span className="text-xdj-muted">חובה לנגן: </span>
            <span className="text-green-400">{preferences.mustPlay.join(" • ")}</span>
          </div>
        )}

        {hasStep("playlists") && preferences.doNotPlay.length > 0 && (
          <div>
            <span className="text-xdj-muted">לא לנגן: </span>
            <span className="text-red-400">{preferences.doNotPlay.join(" • ")}</span>
          </div>
        )}

        {hasStep("playlists") && preferences.djNotes && (
          <div>
            <span className="text-xdj-muted">הערות: </span>
            <span className="text-xdj-text italic">{preferences.djNotes}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onComplete}
          className="btn-luxury-primary flex-1 px-6 py-3 rounded-sm text-sm tracking-wide"
        >
          סיום והמשך לדירוג שירים
        </button>
        <button type="button" onClick={onSkip} className="btn-luxury px-6 py-3 rounded-sm text-sm">
          דלג
        </button>
      </div>
    </div>
  );
}
