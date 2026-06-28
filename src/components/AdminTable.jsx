import React, { useState } from "react";
import { OFFICIAL_CATEGORIES } from "../lib/categories";
import TrackReloadButton from "./TrackReloadButton";
import { countMissingTracks, getTrackSourceSummary } from "../lib/trackSource";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function AdminTable({
  tracks,
  currentTrack,
  onUpdateTrack,
  onDeleteTrack,
  onPreviewTrack,
  onTrackReloaded,
  onRefreshTrackFiles,
}) {
  const { t, dir } = useI18n();
  const missingCount = countMissingTracks(tracks);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleRefresh = async () => {
    if (!onRefreshTrackFiles || refreshing) return;
    setRefreshing(true);
    try {
      await onRefreshTrackFiles();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!onDeleteTrack || deletingId) return;
    setDeletingId(id);
    try {
      await onDeleteTrack(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="xdj-browser">
      <div className="xdj-browser-header flex flex-wrap items-center justify-between gap-2">
        <span className="font-lcd text-xs tracking-[0.25em] text-xdj-cyan">{t("admin.catalogEditor")}</span>
        <div className="flex items-center gap-2">
          {onRefreshTrackFiles ? (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-[10px] px-2 py-1 rounded border border-xdj-cyan/40 text-xdj-cyan hover:bg-xdj-cyan/10 disabled:opacity-40"
            >
              {refreshing ? t("admin.checking") : t("admin.checkFiles")}
            </button>
          ) : null}
          <span className="text-[10px] text-xdj-muted">{t("admin.rowHint")}</span>
        </div>
      </div>

      {missingCount > 0 ? (
        <div
          className="mx-3 mt-3 mb-1 rounded-sm border border-red-500/50 bg-red-950/40 px-4 py-3 text-right"
          role="alert"
          dir={dir}
        >
          <p className="text-sm font-semibold text-red-300">
            {t("admin.missingAlert", {
              count: missingCount,
              plural: missingCount === 1 ? "" : dir === "rtl" ? "ים" : "s",
            })}
          </p>
          <p className="text-xs text-red-200/80 mt-1">{t("admin.missingHelp")}</p>
        </div>
      ) : null}

      <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-right border-collapse">
        <thead>
          <tr className="xdj-browser-columns text-xs">
            <th className="p-4 w-14 text-center">{t("admin.colPreview")}</th>
            <th className="p-4 w-32 text-center sticky right-0 z-10 bg-xdj-panel/95 backdrop-blur-sm shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">{t("admin.colActions")}</th>
            <th className="p-4">{t("admin.colTitle")}</th>
            <th className="p-4">{t("admin.colFilename")}</th>
            <th className="p-4 min-w-[200px]">{t("admin.colSource")}</th>
            <th className="p-4">באקט</th>
            <th className="p-4 w-24">התחלה (S)</th>
            <th className="p-4 w-24">סיום (S)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-xdj-border/30">
          {tracks.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-8 text-center">
                <p className="font-lcd text-xs text-xdj-muted">{t("admin.emptyTable")}</p>
                <p className="text-xs text-xdj-muted mt-2">{t("admin.emptyTableHint")}</p>
              </td>
            </tr>
          ) : null}
          {tracks.map((track) => {
            const isSelected = currentTrack?.id === track.id;
            const canPreview = !track.isMissing;
            const needsReload = track.isMissing === true;
            const source = getTrackSourceSummary(track, t);

            return (
              <tr
                key={track.id}
                onClick={() => onPreviewTrack(track)}
                className={`xdj-browser-row transition-colors cursor-pointer ${
                  isSelected ? "bg-xdj-cyan/10 ring-1 ring-inset ring-xdj-cyan/30" : "hover:bg-xdj-cyan/5"
                } ${needsReload ? "bg-red-950/20 opacity-80" : ""}`}
              >
                <td className="p-3 text-center">
                  <button
                    type="button"
                    disabled={!canPreview}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewTrack(track, { play: true });
                    }}
                    className={`xdj-az-preview-btn ${isSelected ? "is-selected" : ""}`}
                    title={canPreview ? "נגן תצוגה מקדימה" : "קובץ חסר"}
                    aria-label="Preview track"
                  >
                    <span className="xdj-az-play-tri" />
                  </button>
                </td>
                <td
                  className={`p-3 text-center sticky right-0 z-10 shadow-[-4px_0_8px_rgba(0,0,0,0.2)] ${
                    isSelected ? "bg-xdj-cyan/10" : needsReload ? "bg-red-950/40" : "bg-xdj-panel/95"
                  } backdrop-blur-sm`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col items-center gap-1.5 min-w-[88px]">
                    {onTrackReloaded ? (
                      <TrackReloadButton
                        track={track}
                        onReloaded={onTrackReloaded}
                        compact
                        label={needsReload ? t("admin.reload") : t("admin.replace")}
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleDelete(track.id)}
                      disabled={deletingId === track.id}
                      className="text-[10px] font-bold text-red-300 hover:text-red-100 px-2 py-1 rounded border border-red-500/50 hover:border-red-400 hover:bg-red-950/50 transition-colors disabled:opacity-40 min-h-[28px] min-w-[72px]"
                    >
                      {deletingId === track.id ? t("admin.deleting") : t("admin.delete")}
                    </button>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-col w-full" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <input
                        className="bg-transparent border-b border-transparent focus:border-purple-500 outline-none w-full font-bold text-gray-200"
                        value={track.title}
                        onChange={(e) => onUpdateTrack(track.id, "title", e.target.value)}
                      />
                      {track.isMissing && (
                        <span className="text-[10px] text-red-400 font-bold bg-red-950 px-1.5 py-0.5 rounded border border-red-900 shadow-sm shrink-0">
                          {t("trackSource.missing")}
                        </span>
                      )}
                    </div>
                    <input
                      className="bg-transparent text-xs text-gray-500 border-b border-transparent focus:border-purple-500 outline-none w-full"
                      value={track.artist}
                      onChange={(e) => onUpdateTrack(track.id, "artist", e.target.value)}
                    />
                  </div>
                </td>
                <td className="p-3 text-sm font-mono text-gray-400" onClick={(e) => e.stopPropagation()}>
                  <input
                    className="bg-transparent border-b border-transparent focus:border-purple-500 outline-none w-full"
                    value={track.filename}
                    onChange={(e) => onUpdateTrack(track.id, "filename", e.target.value)}
                  />
                </td>
                <td className="p-3 text-xs" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                          source.status === "missing"
                            ? "text-red-300 bg-red-950 border-red-800"
                            : "text-xdj-cyan bg-xdj-cyan/10 border-xdj-cyan/30"
                        }`}
                      >
                        {source.statusLabel}
                      </span>
                      <span className="text-[10px] text-xdj-muted">{source.kindLabel}</span>
                    </div>
                    {source.playbackUrl ? (
                      <p className="font-mono text-[10px] text-gray-400 break-all" title="כתובת נגינה באתר">
                        ▶ {source.playbackUrl}
                      </p>
                    ) : null}
                    {source.diskPath ? (
                      <p className="font-mono text-[10px] text-gray-500 break-all" title="נתיב בדיסק השרת (persistent disk ב-Render)">
                        📁 {source.diskPath}
                      </p>
                    ) : null}
                    {source.originPath ? (
                      <p className="font-mono text-[10px] text-amber-500/80 break-all" title="מקור מקורי ב-Dropbox">
                        Dropbox: {source.originPath}
                      </p>
                    ) : null}
                    {source.alert ? (
                      <p className="text-[10px] text-red-400 font-medium">{source.alert}</p>
                    ) : null}
                  </div>
                </td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    className="bg-gray-800 text-xs rounded px-2 py-1 outline-none border border-gray-700 text-gray-200"
                    value={track.bucket}
                    onChange={(e) => onUpdateTrack(track.id, "bucket", e.target.value)}
                  >
                    {OFFICIAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number"
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-full text-center text-purple-400"
                    value={track.startTime}
                    onChange={(e) => onUpdateTrack(track.id, "startTime", e.target.value)}
                  />
                </td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number"
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-full text-center text-pink-400"
                    value={track.endTime}
                    onChange={(e) => onUpdateTrack(track.id, "endTime", e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </section>
  );
}
