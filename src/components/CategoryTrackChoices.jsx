import React from "react";
import { getVibeLabel } from "./GenreVibeMeter";
import DropTypeBadge from "./DropTypeBadge";
import { useI18n } from "../lib/i18n/AppSettingsContext";

function TrackChip({ track, variant }) {
  const dropLabel = track.drop?.trim();
  return (
    <li
      className={`category-track-chip category-track-chip--${variant}`}
      title={track.comment || undefined}
    >
      <span className="category-track-chip-title">{track.title}</span>
      <span className="category-track-chip-artist">{track.artist}</span>
      {dropLabel ? (
        <span className="category-track-chip-drop">
          <DropTypeBadge drop={dropLabel} compact />
        </span>
      ) : null}
      {track.comment ? <span className="category-track-chip-note">"{track.comment}"</span> : null}
    </li>
  );
}

function TrackColumn({ tracks, variant, emptyLabel, label }) {
  return (
    <div className={`category-track-col category-track-col--${variant}`}>
      <span className="category-track-col-label">{label}</span>
      {tracks.length === 0 ? (
        <p className="category-track-col-empty">{emptyLabel}</p>
      ) : (
        <ul className="category-track-list">
          {tracks.map((track) => (
            <TrackChip key={`${track.id}-${track.versionId || "default"}`} track={track} variant={variant} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CategoryTrackChoices({ groups, categoryRatings = {} }) {
  const { t, dir } = useI18n();

  const hasAny = groups.some((g) => g.liked.length > 0 || g.disliked.length > 0);
  if (!groups.length) return null;

  return (
    <section className="panel-luxury rounded-sm p-5 sm:p-6" dir={dir}>
      <h3 className="text-lg font-bold text-xdj-text mb-1">{t("home.categoryTracksTitle")}</h3>
      <p className="text-sm text-xdj-muted mb-5">{t("home.categoryTracksHint")}</p>

      {!hasAny ? (
        <p className="text-sm text-xdj-muted text-center py-4">{t("home.categoryTracksEmpty")}</p>
      ) : (
        <div className="category-track-grid">
          <div className="category-track-grid-head">
            <span>{t("home.categoryCol")}</span>
            <span className="category-track-grid-head--like">{t("home.likedCol")}</span>
            <span className="category-track-grid-head--dislike">{t("home.dislikedCol")}</span>
          </div>

          {groups.map(({ category, liked, disliked }) => {
            const stars = categoryRatings[category] || 0;
            if (liked.length === 0 && disliked.length === 0) return null;

            return (
              <div key={category} className="category-track-grid-row">
                <div className="category-track-category-cell">
                  <span className="category-track-category-name">{category}</span>
                  {stars > 0 ? (
                    <span className="category-track-category-stars text-xdj-gold text-[10px]">
                      {getVibeLabel(t, stars)}
                    </span>
                  ) : null}
                </div>
                <TrackColumn tracks={liked} variant="like" emptyLabel="—" label={t("home.likedCol")} />
                <TrackColumn tracks={disliked} variant="dislike" emptyLabel="—" label={t("home.dislikedCol")} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
