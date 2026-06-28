import React from "react";
import ClientPreferencesSummary from "./ClientPreferencesSummary";
import CategoryBreakdown from "./CategoryBreakdown";
import CategoryTrackChoices from "./CategoryTrackChoices";
import { getCategoryBreakdown, getLikedTracks, getTracksByCategoryRating } from "../lib/feedbackAnalytics";
import { useGenres } from "../hooks/useGenres";
import { useI18n } from "../lib/i18n/AppSettingsContext";

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
  onOpenGuide,
  onLogout,
}) {
  const { t, dir } = useI18n();
  const genres = useGenres();
  const breakdown = getCategoryBreakdown(
    genres,
    selectedCategories,
    categoryRatings
  );
  const likedTracks = getLikedTracks(tracks, ratings, comments);
  const categoryTrackGroups = getTracksByCategoryRating(
    tracks,
    ratings,
    comments,
    selectedCategories
  );
  const commentCount = Object.keys(comments).filter((k) => comments[k]?.trim()).length;
  const energyId = preferences.energyLevel;
  const energyLabel = energyId ? t(`energy.${energyId}.label`) : "—";
  const wizardDone = preferences.wizardCompleted;
  const hasProgress =
    wizardDone ||
    preferences.eventDate ||
    preferences.eventLocation ||
    selectedCategories.length < genres.length ||
    preferences.wizardStep > 0;

  const formCtaLabel = wizardDone
    ? t("home.editPreferences")
    : hasProgress
      ? t("home.continueForm")
      : t("home.startForm");

  return (
    <div className="client-home flex flex-col gap-4 sm:gap-6 pb-4" dir={dir}>
      <div className="client-home-hero panel-luxury rounded-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-[system-ui,-apple-system,BlinkMacSystemFont,sans-serif] text-[10px] tracking-[0.25em] text-xdj-cyan uppercase mb-1">
              {t("home.dashboard")}
            </p>
            <h2 className="text-xl font-semibold text-xdj-gold">{t("home.hello", { name: client.name })}</h2>
            <p className="text-xs text-xdj-muted mt-1">
              {wizardDone ? t("home.doneHint") : t("home.startHint")}
            </p>
          </div>
          <button type="button" onClick={onLogout} className="btn-luxury px-4 py-2 rounded-sm text-xs shrink-0">
            {t("common.logout")}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="client-stat-card">
            <span className="client-stat-label">{t("home.formStatus")}</span>
            <span className={`client-stat-value ${wizardDone ? "text-xdj-cyan" : "text-xdj-orange"}`}>
              {wizardDone ? t("home.formDone") : t("home.formInProgress")}
            </span>
          </div>
          <div className="client-stat-card">
            <span className="client-stat-label">{t("home.energy")}</span>
            <span className="client-stat-value">{energyLabel}</span>
          </div>
          <div className="client-stat-card">
            <span className="client-stat-label">{t("home.likedTracks")}</span>
            <span className="client-stat-value text-xdj-gold">{likedTracks.length}</span>
          </div>
          <div className="client-stat-card">
            <span className="client-stat-label">{t("home.trackComments")}</span>
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
              {t("home.browseMusic")}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenGuide}
            className="btn-luxury px-5 py-3 rounded-sm text-sm min-h-[44px]"
          >
            {t("home.openGuide")}
          </button>
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
          <CategoryTrackChoices groups={categoryTrackGroups} categoryRatings={categoryRatings} />
        </>
      ) : (
        <section className="panel-luxury rounded-sm p-6 text-center">
          <p className="text-sm text-xdj-muted">{t("home.emptyHint")}</p>
        </section>
      )}
    </div>
  );
}
