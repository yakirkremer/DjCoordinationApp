import React from "react";
import ClientPreferencesSummary from "./ClientPreferencesSummary";
import CategoryBreakdown from "./CategoryBreakdown";
import { getCategoryBreakdown, getLikedTracks } from "../lib/feedbackAnalytics";
import { OFFICIAL_CATEGORIES } from "../lib/categories";
import { ENERGY_LEVELS } from "../lib/preferences";

export default function ClientHome({
  client,
  preferences,
  formSchema,
  selectedCategories,
  categoryRatings,
  ratings,
  comments,
  tracks,
  onStartWizard,
  onBrowseMusic,
  onLogout,
}) {
  const breakdown = getCategoryBreakdown(
    OFFICIAL_CATEGORIES,
    selectedCategories,
    categoryRatings
  );
  const likedTracks = getLikedTracks(tracks, ratings, comments);
  const commentCount = Object.keys(comments).filter((k) => comments[k]?.trim()).length;
  const energy = ENERGY_LEVELS.find((l) => l.id === preferences.energyLevel);
  const wizardDone = preferences.wizardCompleted;
  const hasProgress =
    wizardDone ||
    preferences.eventDate ||
    preferences.eventLocation ||
    selectedCategories.length < OFFICIAL_CATEGORIES.length ||
    preferences.wizardStep > 0;

  const formCtaLabel = wizardDone
    ? "ערוך העדפות"
    : hasProgress
      ? "המשך מילוי הטופס"
      : "התחל טופס העדפות";

  return (
    <div className="client-home flex flex-col gap-4 sm:gap-6 pb-4" dir="rtl">
      <div className="client-home-hero panel-luxury rounded-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-lcd text-[10px] tracking-[0.25em] text-xdj-cyan uppercase mb-1">
              לוח בקרה
            </p>
            <h2 className="text-xl font-semibold text-xdj-gold">שלום, {client.name}</h2>
            <p className="text-xs text-xdj-muted mt-1">
              {wizardDone
                ? "העדפותיך נשמרו — ניתן לערוך או לגלוש במוזיקה"
                : "מלאו את טופס ההעדפות כדי לפתוח את קטלוג השירים"}
            </p>
          </div>
          <button type="button" onClick={onLogout} className="btn-luxury px-4 py-2 rounded-sm text-xs shrink-0">
            יציאה
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="client-stat-card">
            <span className="client-stat-label">סטטוס טופס</span>
            <span className={`client-stat-value ${wizardDone ? "text-xdj-cyan" : "text-xdj-orange"}`}>
              {wizardDone ? "הושלם" : "בתהליך"}
            </span>
          </div>
          <div className="client-stat-card">
            <span className="client-stat-label">אנרגיה</span>
            <span className="client-stat-value">{energy?.label ?? "—"}</span>
          </div>
          <div className="client-stat-card">
            <span className="client-stat-label">שירים שאהבתי</span>
            <span className="client-stat-value text-xdj-gold">{likedTracks.length}</span>
          </div>
          <div className="client-stat-card">
            <span className="client-stat-label">הערות לשירים</span>
            <span className="client-stat-value">{commentCount}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <button type="button" onClick={onStartWizard} className="btn-luxury-primary px-5 py-3 rounded-sm text-sm min-h-[44px]">
            {formCtaLabel}
          </button>
          {wizardDone && (
            <button
              type="button"
              onClick={onBrowseMusic}
              className="btn-luxury-gold px-5 py-3 rounded-sm text-sm min-h-[44px]"
            >
              גלוש ודרג שירים
            </button>
          )}
        </div>
      </div>

      {hasProgress ? (
        <>
          <ClientPreferencesSummary
            preferences={preferences}
            formSchema={formSchema}
            clientType={client.clientType}
          />
          <CategoryBreakdown breakdown={breakdown} />
        </>
      ) : (
        <section className="panel-luxury rounded-sm p-6 text-center">
          <p className="text-sm text-xdj-muted">
            עדיין לא מילאתם העדפות. לחצו על &quot;התחל טופס העדפות&quot; כדי להתחיל.
          </p>
        </section>
      )}
    </div>
  );
}
