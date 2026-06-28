import React, { useState } from "react";
import { OFFICIAL_CATEGORIES } from "../lib/categories";
import TrackReloadButton from "./TrackReloadButton";
import { countMissingTracks, getTrackSourceSummary } from "../lib/trackSource";

export default function AdminTable({
  tracks,
  currentTrack,
  onUpdateTrack,
  onDeleteTrack,
  onPreviewTrack,
  onTrackReloaded,
  onRefreshTrackFiles,
}) {
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
    <section className="xdj-browser overflow-hidden">
      <div className="xdj-browser-header flex flex-wrap items-center justify-between gap-2">
        <span className="font-lcd text-xs tracking-[0.25em] text-xdj-cyan">CATALOG EDITOR</span>
        <div className="flex items-center gap-2">
          {onRefreshTrackFiles ? (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-[10px] px-2 py-1 rounded border border-xdj-cyan/40 text-xdj-cyan hover:bg-xdj-cyan/10 disabled:opacity-40"
            >
              {refreshing ? "בודק..." : "בדוק קבצים"}
            </button>
          ) : null}
          <span className="text-[10px] text-xdj-muted">לחץ שורה לעריכת תצוגה מקדימה · גרור A/B בנגן</span>
        </div>
      </div>

      {missingCount > 0 ? (
        <div
          className="mx-3 mt-3 mb-1 rounded-sm border border-red-500/50 bg-red-950/40 px-4 py-3 text-right"
          role="alert"
        >
          <p className="text-sm font-semibold text-red-300">
            ⚠ {missingCount} שיר{missingCount === 1 ? "" : "ים"} ללא קובץ — לא ניתן לנגן
          </p>
          <p className="text-xs text-red-200/80 mt-1">
            הנגינה תמיד מהשרת: <code className="text-red-100">/music/&#123;קטגוריה&#125;/analyzed/&#123;קובץ&#125;</code>.
            השתמשו ב<strong className="font-semibold"> טען מחדש </strong>או ייבוא מ-Dropbox כדי לשחזר קבצים חסרים.
          </p>
        </div>
      ) : null}

      <table className="w-full text-right border-collapse">
        <thead>
          <tr className="xdj-browser-columns text-xs">
            <th className="p-4 w-14 text-center">תצוגה</th>
            <th className="p-4">שם השיר / אמן</th>
            <th className="p-4">קובץ (Filename)</th>
            <th className="p-4 min-w-[200px]">מקור נגינה</th>
            <th className="p-4">באקט</th>
            <th className="p-4 w-24">התחלה (S)</th>
            <th className="p-4 w-24">סיום (S)</th>
            <th className="p-4 w-28 text-center">פעולות</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-xdj-border/30">
          {tracks.map((track) => {
            const isSelected = currentTrack?.id === track.id;
            const canPreview = !track.isMissing;
            const needsReload = track.isMissing === true;
            const source = getTrackSourceSummary(track);

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
                          קובץ חסר
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
                      <p className="font-mono text-[10px] text-gray-500 break-all" title="נתיב בדיסק השרת">
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
                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col items-center gap-1.5">
                    {onTrackReloaded ? (
                      <TrackReloadButton
                        track={track}
                        onReloaded={onTrackReloaded}
                        compact
                        label={needsReload ? "טען מחדש" : "החלף"}
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleDelete(track.id)}
                      disabled={deletingId === track.id}
                      className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-gray-800 transition-colors disabled:opacity-40"
                      title="מחק שיר מהקטלוג ומהשרת"
                    >
                      {deletingId === track.id ? "…" : "🗑️"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
