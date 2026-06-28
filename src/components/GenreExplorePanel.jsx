import React, { useMemo } from "react";
import PreviewWaveform from "./PreviewWaveform";
import TrackArtwork from "./TrackArtwork";
import DropTypeBadge from "./DropTypeBadge";
import GenreVibeMeter from "./GenreVibeMeter";
import { countTracksForGenre, entryPlaybackTrack, getTracksForGenre, isDropMirrorGenre } from "../lib/genreCatalog";
import { getGenreAccent } from "../lib/genreColors";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function GenreExplorePanel({
  genre,
  tracks,
  categoryRating = 0,
  isSelected = false,
  onRateCategory,
  onToggleCategory,
  onClose,
  currentTrack,
  isPlaying,
  onTrackSelect,
  formatTime,
}) {
  const { t, dir } = useI18n();

  const entries = useMemo(() => getTracksForGenre(tracks, genre), [tracks, genre]);
  const accent = getGenreAccent(genre);
  const dropMirror = isDropMirrorGenre(genre);

  const handleRate = (level) => {
    onRateCategory(genre, level);
    if (level > 0 && !isSelected) {
      onToggleCategory(genre);
    }
    if (level === 0 && isSelected) {
      onToggleCategory(genre);
    }
  };

  const handlePlay = (entry) => {
    onTrackSelect(entry.track, {
      versionId: entry.versionId,
      lockVersion: entry.lockVersion,
    });
  };

  return (
    <div className="genre-explore-panel" style={{ "--genre-accent": accent }} dir={dir}>
      <div className="genre-explore-toolbar">
        <button type="button" onClick={onClose} className="genre-explore-back btn-luxury px-3 py-2 rounded-sm text-xs">
          {t("genreExplore.back")}
        </button>
        <div className="genre-explore-toolbar-meta">
          <h3 className="genre-explore-title">{genre}</h3>
          <p className="genre-explore-sub">
            {t("genreExplore.trackCount", { count: entries.length })}
            {dropMirror ? ` · ${t("genreExplore.includesDrops")}` : ""}
          </p>
        </div>
      </div>

      <div className="genre-explore-list">
        {entries.length === 0 ? (
          <p className="genre-explore-empty">{t("genreExplore.empty")}</p>
        ) : (
          entries.map((entry) => {
            const playTrack = entryPlaybackTrack(entry);
            const isCurrent =
              currentTrack?.id === entry.track.id &&
              currentTrack?.activeVersionId === entry.versionId;
            const isThisPlaying = isCurrent && isPlaying;

            return (
              <div
                key={`${entry.track.id}-${entry.versionId}`}
                className={`genre-explore-row ${isThisPlaying ? "is-playing" : isCurrent ? "is-selected" : ""}`}
              >
                <button
                  type="button"
                  className="genre-explore-play"
                  onClick={() => handlePlay(entry)}
                  aria-label={isThisPlaying ? t("genreExplore.pause") : t("genreExplore.play")}
                >
                  {isThisPlaying ? "❚❚" : "▶"}
                </button>
                <TrackArtwork track={entry.track} />
                <div className="genre-explore-row-meta min-w-0">
                  <div className="genre-explore-row-title">{entry.track.title}</div>
                  <div className="genre-explore-row-artist">{entry.track.artist}</div>
                  <div className="genre-explore-row-badges">
                    {entry.via === "drop" ? (
                      <>
                        <span className="genre-explore-via">{entry.track.bucket}</span>
                        <DropTypeBadge drop={playTrack.drop} compact />
                      </>
                    ) : entry.lockVersion ? (
                      <DropTypeBadge drop={playTrack.drop} compact />
                    ) : null}
                  </div>
                </div>
                <div className="genre-explore-wave hidden sm:block" onClick={() => handlePlay(entry)}>
                  <PreviewWaveform track={playTrack} isActive={isCurrent} isPlaying={isThisPlaying} />
                </div>
                <span className="genre-explore-duration hidden md:inline">
                  {formatTime ? formatTime(playTrack.endTime - playTrack.startTime) : ""}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="genre-explore-footer">
        <p className="genre-explore-footer-hint">{t("genreExplore.rateHint")}</p>
        <GenreVibeMeter rating={categoryRating} onRate={handleRate} />
      </div>
    </div>
  );
}
