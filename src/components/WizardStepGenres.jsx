import React, { useState } from "react";
import { useGenres } from "../hooks/useGenres";
import GenreExplorePanel from "./GenreExplorePanel";
import GenreVibeMeter, { getVibeLabel } from "./GenreVibeMeter";
import { countTracksForGenre } from "../lib/genreCatalog";
import { getGenreAccent } from "../lib/genreColors";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function WizardStepGenres({
  tracks = [],
  selectedCategories,
  categoryRatings,
  onToggleCategory,
  onRateCategory,
  onTrackSelect,
  currentTrack,
  isPlaying,
  formatTime,
  hideHeader = false,
}) {
  const { t, dir } = useI18n();
  const genres = useGenres();
  const [exploringGenre, setExploringGenre] = useState(null);

  const handleOpenGenre = (genre) => {
    setExploringGenre(genre);
  };

  const handleRateFromCard = (genre, level) => {
    onRateCategory(genre, level);
    const selected = selectedCategories.includes(genre);
    if (level > 0 && !selected) onToggleCategory(genre);
    if (level === 0 && selected) onToggleCategory(genre);
  };

  if (exploringGenre) {
    return (
      <GenreExplorePanel
        genre={exploringGenre}
        tracks={tracks}
        categoryRating={categoryRatings[exploringGenre] || 0}
        isSelected={selectedCategories.includes(exploringGenre)}
        onRateCategory={onRateCategory}
        onToggleCategory={onToggleCategory}
        onClose={() => setExploringGenre(null)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTrackSelect={onTrackSelect}
        formatTime={formatTime}
      />
    );
  }

  const ratedCount = selectedCategories.filter((g) => (categoryRatings[g] || 0) > 0).length;

  return (
    <div className="wizard-genres-step flex flex-col gap-4" dir={dir}>
      {!hideHeader && (
        <p className="text-xs text-xdj-muted">{t("genreExplore.pickHint")}</p>
      )}

      <div className="wizard-genre-grid">
        {genres.map((genre) => {
          const rating = categoryRatings[genre] || 0;
          const selected = selectedCategories.includes(genre);
          const count = countTracksForGenre(tracks, genre);
          const accent = getGenreAccent(genre);

          return (
            <article
              key={genre}
              className={`wizard-genre-card ${selected ? "is-selected" : ""} ${
                rating > 0 ? "is-rated" : ""
              }`}
              style={{ "--genre-accent": accent }}
            >
              <button
                type="button"
                className="wizard-genre-card-open"
                onClick={() => handleOpenGenre(genre)}
              >
                <span className="wizard-genre-card-icon" aria-hidden>
                  ♪
                </span>
                <span className="wizard-genre-card-name">{genre}</span>
                <span className="wizard-genre-card-count">
                  {t("genreExplore.trackCount", { count })}
                </span>
                {rating > 0 ? (
                  <span className="wizard-genre-card-vibe">{getVibeLabel(t, rating)}</span>
                ) : (
                  <span className="wizard-genre-card-cta">{t("genreExplore.tapToListen")}</span>
                )}
              </button>
              {rating > 0 && (
                <div className="wizard-genre-card-meter" onClick={(e) => e.stopPropagation()}>
                  <GenreVibeMeter
                    rating={rating}
                    onRate={(level) => handleRateFromCard(genre, level)}
                    compact
                    showLabel={false}
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>

      {ratedCount === 0 ? (
        <p className="text-xs text-xdj-orange">{t("genreExplore.needRating")}</p>
      ) : (
        <p className="text-xs text-xdj-cyan">
          {t("genreExplore.ratedSummary", { count: ratedCount })}
        </p>
      )}
    </div>
  );
}
