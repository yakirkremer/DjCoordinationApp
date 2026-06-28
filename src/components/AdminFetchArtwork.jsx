import React, { useState } from "react";
import { fetchCatalogArtwork } from "../lib/api/artworkApi";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function AdminFetchArtwork({ tracks, onTracksUpdated }) {
  const { t, dir } = useI18n();
  const [force, setForce] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  const handleRun = async () => {
    if (running || tracks.length === 0) return;
    setRunning(true);
    setError("");
    setSummary(null);

    try {
      const data = await fetchCatalogArtwork({ force });
      onTracksUpdated?.(data.tracks);
      setSummary(data.stats);
    } catch (err) {
      setError(err.message || t("admin.artworkFetchFailed"));
    } finally {
      setRunning(false);
    }
  };

  const statLine = summary
    ? t("admin.artworkFetchSummary", {
        found: (summary.itunes || 0) + (summary.deezer || 0),
        skip: summary.skip || 0,
        missing: summary["not-found"] || 0,
        errors: summary.error || 0,
        total: summary.total || 0,
      })
    : null;

  return (
    <section className="panel-luxury rounded-sm p-4 sm:p-5" dir={dir}>
      <p className="font-lcd text-[10px] tracking-[0.25em] text-xdj-cyan uppercase mb-1">
        {t("admin.artworkToolTitle")}
      </p>
      <h3 className="text-sm font-semibold text-xdj-gold mb-1">{t("admin.artworkToolHeading")}</h3>
      <p className="text-xs text-xdj-muted mb-4">{t("admin.artworkToolHint")}</p>

      <label className="flex items-center gap-2 text-xs text-xdj-text mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={force}
          onChange={(e) => setForce(e.target.checked)}
          disabled={running}
          className="accent-xdj-cyan"
        />
        {t("admin.artworkForce")}
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRun}
          disabled={running || tracks.length === 0}
          className="btn-luxury-primary px-4 py-2 rounded-sm text-xs min-h-[40px] disabled:opacity-40"
        >
          {running ? t("admin.artworkFetching") : t("admin.artworkFetchRun")}
        </button>
        <span className="text-[10px] text-xdj-muted">
          {t("admin.artworkTrackCount", { count: tracks.length })}
        </span>
      </div>

      {error ? <p className="text-xs text-xdj-orange mt-3">{error}</p> : null}
      {statLine ? <p className="text-xs text-xdj-cyan mt-3">{statLine}</p> : null}
    </section>
  );
}
