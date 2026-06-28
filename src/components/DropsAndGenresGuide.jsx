import React from "react";
import { OFFICIAL_CATEGORIES } from "../lib/categories";
import { getDropGuide, getGenreGuide } from "../lib/guideContent";
import { normalizeDropTypes } from "../lib/dropTypes";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";
import DropTypeBadge from "./DropTypeBadge";

const BUCKET_COLORS = {
  Israeli: "#c9a962",
  Loazi: "#00c8e8",
  Mizrahit: "#ff6b2c",
  Oldies: "#a78bfa",
  "Hip Hop": "#f472b6",
  Regatton: "#34d399",
  Trance: "#60a5fa",
  Techno: "#fbbf24",
  Tomorrowland: "#22c55e",
};

export default function DropsAndGenresGuide({ onBack }) {
  const { settings } = useAppSettingsContext();
  const { t, locale, dir } = useI18n();
  const dropTypes = normalizeDropTypes(settings.dropTypes);

  return (
    <div className="guide-page flex flex-col gap-5 sm:gap-6 pb-6" dir={dir}>
      <div className="guide-hero panel-luxury rounded-sm p-5 sm:p-8">
        <p className="font-lcd text-[10px] tracking-[0.25em] text-xdj-cyan uppercase mb-2">
          {t("guide.kicker")}
        </p>
        <h1 className="text-xl sm:text-2xl font-semibold text-xdj-gold mb-2">{t("guide.title")}</h1>
        <p className="text-sm text-xdj-muted max-w-2xl leading-relaxed">{t("guide.intro")}</p>
        {onBack ? (
          <button type="button" onClick={onBack} className="btn-luxury mt-5 px-4 py-2 rounded-sm text-xs">
            {t("common.back")}
          </button>
        ) : null}
      </div>

      <section className="guide-section panel-luxury rounded-sm p-5 sm:p-6">
        <h2 className="guide-section-title">{t("guide.genresTitle")}</h2>
        <p className="text-xs text-xdj-muted mb-5 max-w-2xl">{t("guide.genresIntro")}</p>
        <div className="guide-card-grid">
          {OFFICIAL_CATEGORIES.map((genre) => {
            const { title, body } = getGenreGuide(locale, genre);
            const accent = BUCKET_COLORS[genre] || "#6b6b78";
            return (
              <article
                key={genre}
                className="guide-card guide-card--genre"
                style={{ "--guide-accent": accent }}
              >
                <div className="guide-card-accent" aria-hidden />
                <h3 className="guide-card-title">{title}</h3>
                <p className="guide-card-body">{body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="guide-section panel-luxury rounded-sm p-5 sm:p-6">
        <h2 className="guide-section-title">{t("guide.dropsTitle")}</h2>
        <p className="text-xs text-xdj-muted mb-5 max-w-2xl">{t("guide.dropsIntro")}</p>
        <div className="guide-card-grid">
          {dropTypes.map((drop) => {
            const custom = getDropGuide(locale, drop);
            const title = custom?.title || drop;
            const body = custom?.body || t("guide.dropFallback", { drop });
            return (
              <article key={drop} className="guide-card guide-card--drop">
                <DropTypeBadge drop={drop} className="mb-3" />
                <h3 className="guide-card-title">{title}</h3>
                <p className="guide-card-body">{body}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
