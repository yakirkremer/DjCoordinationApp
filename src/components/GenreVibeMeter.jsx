import React from "react";
import { useI18n } from "../lib/i18n/AppSettingsContext";

const LEVELS = [1, 2, 3, 4, 5];

export function getVibeLabel(t, level) {
  if (!level) return t("genreVibe.none");
  return t(`genreVibe.level${level}`);
}

const VIBE_VALUE_COLORS = ["", "#f87171", "#fb923c", "#facc15", "#a3e635", "#4ade80"];

export default function GenreVibeMeter({ rating = 0, onRate, compact = false, showLabel = true }) {
  const { t, dir } = useI18n();

  return (
    <div
      className={`genre-vibe-meter ${compact ? "is-compact" : ""} ${rating ? `has-rating-${rating}` : ""}`}
      dir={dir}
    >
      {showLabel && (
        <div className="genre-vibe-meter-header">
          <span className="genre-vibe-meter-title">{t("genreVibe.title")}</span>
          <span
            className={`genre-vibe-meter-value ${rating ? "has-value" : ""}`}
            style={rating ? { color: VIBE_VALUE_COLORS[rating] } : undefined}
          >
            {getVibeLabel(t, rating)}
          </span>
        </div>
      )}
      <div className="genre-vibe-meter-track" role="group" aria-label={t("genreVibe.title")}>
        {LEVELS.map((level) => {
          const active = rating >= level;
          const isSelected = rating === level;
          return (
            <button
              key={level}
              type="button"
              className={`genre-vibe-segment level-${level} ${active ? "is-active" : ""} ${
                isSelected ? "is-selected" : ""
              }`}
              onClick={() => onRate(rating === level ? 0 : level)}
              aria-label={getVibeLabel(t, level)}
              aria-pressed={isSelected}
            >
              <span className="genre-vibe-segment-fill" />
              <span className="genre-vibe-segment-glow" aria-hidden />
            </button>
          );
        })}
      </div>
      {!compact && (
        <div className="genre-vibe-meter-labels">
          <span>{t("genreVibe.low")}</span>
          <span>{t("genreVibe.high")}</span>
        </div>
      )}
    </div>
  );
}
