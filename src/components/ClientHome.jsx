import React from "react";
import ClientPreferencesSummary from "./ClientPreferencesSummary";
import CategoryBreakdown from "./CategoryBreakdown";
import CategoryTrackChoices from "./CategoryTrackChoices";
import EditableText from "./EditableText";
import { getCategoryBreakdown, getLikedTracks, getTracksByCategoryRating } from "../lib/feedbackAnalytics";
import { getWizardCompletionPercent } from "../lib/wizardProgress";
import { useGenres } from "../hooks/useGenres";
import { useI18n } from "../lib/i18n/AppSettingsContext";

function formatEventDate(value, locale) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ProgressRing({ percent, label }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="client-dash-ring" style={{ "--ring-pct": clamped }} aria-hidden>
      <div className="client-dash-ring-inner">
        <span className="client-dash-ring-value">{clamped}%</span>
        <span className="client-dash-ring-label">{label}</span>
      </div>
    </div>
  );
}

function ActionCard({ title, description, onClick, disabled = false, variant = "default", icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`client-dash-action-card client-dash-action-card--${variant}${disabled ? " is-disabled" : ""}`}
    >
      <span className="client-dash-action-icon" aria-hidden>
        {icon}
      </span>
      <span className="client-dash-action-copy">
        <span className="client-dash-action-title">{title}</span>
        <span className="client-dash-action-desc">{description}</span>
      </span>
      <span className="client-dash-action-chevron" aria-hidden>
        ›
      </span>
    </button>
  );
}

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
  const { dir, t, locale } = useI18n();
  const genres = useGenres();
  const breakdown = getCategoryBreakdown(genres, selectedCategories, categoryRatings);
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
  const completionPercent = getWizardCompletionPercent(
    formSchema,
    client.clientType,
    preferences,
    selectedCategories,
    categoryRatings
  );
  const eventDateLabel = formatEventDate(preferences.eventDate, locale);
  const primaryCtaKey = wizardDone
    ? "home.editPreferences"
    : hasProgress
      ? "home.continueForm"
      : "home.startForm";

  return (
    <div className="client-dash" dir={dir}>
      <header className="client-dash-header">
        <div className="client-dash-header-copy">
          <p className="client-dash-eyebrow">
            <EditableText k="home.dashboard" />
          </p>
          <h1 className="client-dash-title">
            <EditableText k="home.hello" vars={{ name: client.name }} />
          </h1>
          {eventDateLabel ? (
            <p className="client-dash-meta">
              <EditableText k="home.eventDate" />: {eventDateLabel}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onLogout} className="client-dash-logout btn-luxury-quiet">
          <EditableText k="common.logout" />
        </button>
      </header>

      <section className="client-dash-status panel-luxury">
        <div className="client-dash-status-main">
          <ProgressRing percent={completionPercent} label={t("home.progressComplete")} />
          <div className="client-dash-status-copy">
            <span
              className={`client-dash-badge${wizardDone ? " client-dash-badge--done" : " client-dash-badge--progress"}`}
            >
              {wizardDone ? (
                <EditableText k="home.formDone" />
              ) : (
                <EditableText k="home.formInProgress" />
              )}
            </span>
            <p className="client-dash-lead">
              {wizardDone ? (
                <EditableText k="home.doneHint" />
              ) : (
                <EditableText k="home.startHint" />
              )}
            </p>
            {wizardDone ? (
              <p className="client-dash-sublead">
                <EditableText
                  k="home.progressSummary"
                  vars={{ percent: completionPercent, favorites: likedTracks.length }}
                />
              </p>
            ) : hasProgress ? (
              <p className="client-dash-sublead">
                <EditableText k="home.progressSummaryFormOnly" vars={{ percent: completionPercent }} />
              </p>
            ) : null}
          </div>
        </div>

        <div className="client-dash-metrics">
          <div className="client-dash-metric">
            <span className="client-dash-metric-value">
              {energyId ? <EditableText k={`energy.${energyId}.label`} /> : "—"}
            </span>
            <span className="client-dash-metric-label">
              <EditableText k="home.energy" />
            </span>
          </div>
          <div className="client-dash-metric">
            <span className="client-dash-metric-value client-dash-metric-value--gold">
              {likedTracks.length}
            </span>
            <span className="client-dash-metric-label">
              <EditableText k="home.likedTracks" />
            </span>
          </div>
          <div className="client-dash-metric">
            <span className="client-dash-metric-value">{commentCount}</span>
            <span className="client-dash-metric-label">
              <EditableText k="home.trackComments" />
            </span>
          </div>
        </div>
      </section>

      <section className="client-dash-section" aria-labelledby="client-dash-actions-heading">
        <h2 id="client-dash-actions-heading" className="client-dash-section-title">
          <EditableText k="home.quickActions" />
        </h2>
        <div className="client-dash-action-grid">
          <ActionCard
            variant="primary"
            title={t(primaryCtaKey)}
            description={t("home.actionPreferencesDesc")}
            onClick={onStartWizard}
            icon="📋"
          />
          <ActionCard
            title={t("home.actionBrowseTitle")}
            description={t("home.actionBrowseDesc")}
            onClick={onBrowseMusic}
            icon="🎵"
          />
          <ActionCard
            title={t("home.actionTutorialTitle")}
            description={t("home.actionTutorialDesc")}
            onClick={onOpenTutorial}
            icon="✨"
          />
          <ActionCard
            title={t("home.actionGuideTitle")}
            description={t("home.actionGuideDesc")}
            onClick={onOpenGuide}
            icon="📖"
          />
        </div>
      </section>

      <footer className="client-dash-trust">
        <p>
          <EditableText k="home.privacyNote" />
        </p>
        <p>
          <EditableText k="home.autoSaveNote" />
        </p>
      </footer>

      {hasProgress ? (
        <section className="client-dash-section" aria-labelledby="client-dash-overview-heading">
          <h2 id="client-dash-overview-heading" className="client-dash-section-title">
            <EditableText k="home.overviewTitle" />
          </h2>
          <div className="client-dash-overview-stack">
            <ClientPreferencesSummary
              preferences={preferences}
              formSchema={formSchema}
              clientType={client.clientType}
            />
            <CategoryBreakdown breakdown={breakdown} />
            <CategoryTrackChoices groups={categoryTrackGroups} categoryRatings={categoryRatings} />
          </div>
        </section>
      ) : (
        <section className="client-dash-empty panel-luxury">
          <p>
            <EditableText k="home.emptyHint" />
          </p>
        </section>
      )}
    </div>
  );
}
