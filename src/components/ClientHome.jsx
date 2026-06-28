import React from "react";
import ClientPreferencesSummary from "./ClientPreferencesSummary";
import CategoryBreakdown from "./CategoryBreakdown";
import CategoryTrackChoices from "./CategoryTrackChoices";
import EditableText from "./EditableText";
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
  onOpenTutorial,
  onLogout,
}) {
  const { dir } = useI18n();
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
  const wizardDone = preferences.wizardCompleted;
  const hasProgress =
    wizardDone ||
    preferences.eventDate ||
    preferences.eventLocation ||
    selectedCategories.length < genres.length ||
    preferences.wizardStep > 0;

  return (
    <div className="client-home flex flex-col gap-4 sm:gap-6 pb-4" dir={dir}>
      <div className="client-home-hero panel-luxury rounded-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-[system-ui,-apple-system,BlinkMacSystemFont,sans-serif] text-[10px] tracking-[0.25em] text-xdj-cyan uppercase mb-1">
              <EditableText k="home.dashboard" />
            </p>
            <h2 className="text-xl font-semibold text-xdj-gold">
              <EditableText k="home.hello" vars={{ name: client.name }} />
            </h2>
            <p className="text-xs text-xdj-muted mt-1">
              {wizardDone ? (
                <EditableText k="home.doneHint" />
              ) : (
                <EditableText k="home.startHint" />
              )}
            </p>
          </div>
          <button type="button" onClick={onLogout} className="btn-luxury px-4 py-2 rounded-sm text-xs shrink-0">
            <EditableText k="common.logout" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="client-stat-card">
            <span className="client-stat-label">
              <EditableText k="home.formStatus" />
            </span>
            <span className={`client-stat-value ${wizardDone ? "text-xdj-cyan" : "text-xdj-orange"}`}>
              {wizardDone ? (
                <EditableText k="home.formDone" />
              ) : (
                <EditableText k="home.formInProgress" />
              )}
            </span>
          </div>
          <div className="client-stat-card">
            <span className="client-stat-label">
              <EditableText k="home.energy" />
            </span>
            <span className="client-stat-value">
              {energyId ? <EditableText k={`energy.${energyId}.label`} /> : "—"}
            </span>
          </div>
          <div className="client-stat-card">
            <span className="client-stat-label">
              <EditableText k="home.likedTracks" />
            </span>
            <span className="client-stat-value text-xdj-gold">{likedTracks.length}</span>
          </div>
          <div className="client-stat-card">
            <span className="client-stat-label">
              <EditableText k="home.trackComments" />
            </span>
            <span className="client-stat-value">{commentCount}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <button type="button" onClick={onStartWizard} className="btn-luxury-primary px-5 py-3 rounded-sm text-sm min-h-[44px]">
            {wizardDone ? (
              <EditableText k="home.editPreferences" />
            ) : hasProgress ? (
              <EditableText k="home.continueForm" />
            ) : (
              <EditableText k="home.startForm" />
            )}
          </button>
          {wizardDone && (
            <button
              type="button"
              onClick={onBrowseMusic}
              className="btn-luxury-gold px-5 py-3 rounded-sm text-sm min-h-[44px]"
            >
              <EditableText k="home.browseMusic" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenTutorial}
            className="btn-luxury px-5 py-3 rounded-sm text-sm min-h-[44px]"
          >
            <EditableText k="home.openTutorial" />
          </button>
          <button
            type="button"
            onClick={onOpenGuide}
            className="btn-luxury px-5 py-3 rounded-sm text-sm min-h-[44px]"
          >
            <EditableText k="home.openGuide" />
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
          <p className="text-sm text-xdj-muted">
            <EditableText k="home.emptyHint" />
          </p>
        </section>
      )}
    </div>
  );
}
