import React, { useState, useCallback } from "react";
import { OFFICIAL_CATEGORIES } from "../lib/categories";
import TrackReloadButton from "./TrackReloadButton";
import { countMissingTracks, getTrackSourceSummary } from "../lib/trackSource";
import { useI18n } from "../lib/i18n/AppSettingsContext";
import { updateTrack } from "../lib/api/uploadTrack";

const EDITABLE_FIELDS = ["title", "artist", "filename", "bucket", "startTime", "endTime"];

function pickEditable(track) {
  return {
    title: track.title ?? "",
    artist: track.artist ?? "",
    filename: track.filename ?? "",
    bucket: track.bucket ?? OFFICIAL_CATEGORIES[0],
    startTime: track.startTime ?? 0,
    endTime: track.endTime ?? 0,
  };
}

function draftsEqual(a, b) {
  return EDITABLE_FIELDS.every((key) => String(a[key]) === String(b[key]));
}

export default function AdminTable({
  tracks,
  currentTrack,
  onTrackSaved,
  onDeleteTrack,
  onPreviewTrack,
  onTrackReloaded,
  onRefreshTrackFiles,
}) {
  const { t, dir } = useI18n();
  const missingCount = countMissingTracks(tracks);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [rowError, setRowError] = useState({});

  const hasUnsaved = Object.keys(drafts).length > 0;

  const getDraft = useCallback(
    (track) => {
      if (drafts[track.id]) {
        return { ...pickEditable(track), ...drafts[track.id] };
      }
      return pickEditable(track);
    },
    [drafts]
  );

  const isRowDirty = (track) => {
    const draft = drafts[track.id];
    if (!draft) return false;
    return !draftsEqual(draft, pickEditable(track));
  };

  const handleToggleEditMode = () => {
    if (editMode && hasUnsaved) {
      const ok = window.confirm(t("admin.discardUnsaved"));
      if (!ok) return;
      setDrafts({});
      setRowError({});
    }
    setEditMode((v) => !v);
  };

  const handleDraftChange = (id, field, value) => {
    setRowError((prev) => ({ ...prev, [id]: "" }));
    setDrafts((prev) => {
      const base = prev[id] ?? pickEditable(tracks.find((tr) => tr.id === id) ?? {});
      return { ...prev, [id]: { ...base, [field]: value } };
    });
  };

  const handleCancelRow = (track) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[track.id];
      return next;
    });
    setRowError((prev) => ({ ...prev, [track.id]: "" }));
  };

  const handleSaveRow = async (track) => {
    const draft = getDraft(track);
    const original = pickEditable(track);
    if (draftsEqual(draft, original)) return;

    setSavingId(track.id);
    setRowError((prev) => ({ ...prev, [track.id]: "" }));

    try {
      const saved = await updateTrack(track.id, draft);
      onTrackSaved?.(saved);
      handleCancelRow(track);
    } catch (err) {
      setRowError((prev) => ({ ...prev, [track.id]: err.message || t("admin.saveFailed") }));
    } finally {
      setSavingId(null);
    }
  };

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
      handleCancelRow({ id });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="xdj-browser">
      <div className="xdj-browser-header flex flex-wrap items-center justify-between gap-2">
        <span className="font-lcd text-xs tracking-[0.25em] text-xdj-cyan">{t("admin.catalogEditor")}</span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleEditMode}
            className={`text-[10px] px-2 py-1 rounded border min-h-[28px] ${
              editMode
                ? "border-xdj-gold text-xdj-gold bg-xdj-gold/10"
                : "border-xdj-cyan/40 text-xdj-cyan hover:bg-xdj-cyan/10"
            }`}
          >
            {editMode ? t("admin.exitEditMode") : t("admin.editMode")}
          </button>
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
              <th className="p-4 w-36 text-center sticky right-0 z-10 bg-xdj-panel/95 backdrop-blur-sm shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                {t("admin.colActions")}
              </th>
              <th className="p-4">{t("admin.colTitle")}</th>
              <th className="p-4">{t("admin.colFilename")}</th>
              <th className="p-4 min-w-[200px]">{t("admin.colSource")}</th>
              <th className="p-4">{t("admin.colBucket")}</th>
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
              const row = getDraft(track);
              const isSelected = currentTrack?.id === track.id;
              const canPreview = !track.isMissing;
              const needsReload = track.isMissing === true;
              const source = getTrackSourceSummary(track, t);
              const dirty = isRowDirty(track);
              const saving = savingId === track.id;

              return (
                <tr
                  key={track.id}
                  onClick={() => onPreviewTrack(track)}
                  className={`xdj-browser-row transition-colors cursor-pointer ${
                    isSelected ? "bg-xdj-cyan/10 ring-1 ring-inset ring-xdj-cyan/30" : "hover:bg-xdj-cyan/5"
                  } ${needsReload ? "bg-red-950/20 opacity-80" : ""} ${dirty ? "ring-1 ring-inset ring-xdj-gold/40" : ""}`}
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
                    <div className="flex flex-col items-center gap-1.5 min-w-[96px]">
                      {editMode && dirty ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveRow(track)}
                            disabled={saving}
                            className="text-[10px] font-bold text-xdj-cyan px-2 py-1 rounded border border-xdj-cyan/50 hover:bg-xdj-cyan/10 disabled:opacity-40 min-h-[28px] min-w-[72px]"
                          >
                            {saving ? t("common.saving") : t("admin.saveRow")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelRow(track)}
                            disabled={saving}
                            className="text-[10px] text-xdj-muted px-2 py-1 rounded border border-xdj-border hover:text-xdj-text disabled:opacity-40 min-h-[28px] min-w-[72px]"
                          >
                            {t("admin.cancelRow")}
                          </button>
                        </>
                      ) : null}
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
                      {rowError[track.id] ? (
                        <span className="text-[10px] text-xdj-orange max-w-[96px] leading-tight">{rowError[track.id]}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col w-full">
                      <div className="flex items-center gap-2">
                        {editMode ? (
                          <input
                            className="bg-transparent border-b border-xdj-border focus:border-xdj-cyan outline-none w-full font-bold text-gray-200"
                            value={row.title}
                            onChange={(e) => handleDraftChange(track.id, "title", e.target.value)}
                          />
                        ) : (
                          <span className="font-bold text-gray-200">{track.title}</span>
                        )}
                        {track.isMissing && (
                          <span className="text-[10px] text-red-400 font-bold bg-red-950 px-1.5 py-0.5 rounded border border-red-900 shadow-sm shrink-0">
                            {t("trackSource.missing")}
                          </span>
                        )}
                      </div>
                      {editMode ? (
                        <input
                          className="bg-transparent text-xs text-gray-500 border-b border-xdj-border focus:border-xdj-cyan outline-none w-full mt-1"
                          value={row.artist}
                          onChange={(e) => handleDraftChange(track.id, "artist", e.target.value)}
                        />
                      ) : (
                        <span className="text-xs text-gray-500 mt-1">{track.artist}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-sm font-mono text-gray-400" onClick={(e) => e.stopPropagation()}>
                    {editMode ? (
                      <input
                        className="bg-transparent border-b border-xdj-border focus:border-xdj-cyan outline-none w-full"
                        value={row.filename}
                        onChange={(e) => handleDraftChange(track.id, "filename", e.target.value)}
                      />
                    ) : (
                      <span>{track.filename}</span>
                    )}
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
                        <p className="font-mono text-[10px] text-gray-400 break-all">▶ {source.playbackUrl}</p>
                      ) : null}
                      {source.diskPath ? (
                        <p className="font-mono text-[10px] text-gray-500 break-all">📁 {source.diskPath}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    {editMode ? (
                      <select
                        className="bg-gray-800 text-xs rounded px-2 py-1 outline-none border border-gray-700 text-gray-200"
                        value={row.bucket}
                        onChange={(e) => handleDraftChange(track.id, "bucket", e.target.value)}
                      >
                        {OFFICIAL_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-200">{track.bucket}</span>
                    )}
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    {editMode ? (
                      <input
                        type="number"
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-full text-center text-purple-400"
                        value={row.startTime}
                        onChange={(e) => handleDraftChange(track.id, "startTime", e.target.value)}
                      />
                    ) : (
                      <span className="text-purple-400 text-sm tabular-nums">{track.startTime}</span>
                    )}
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    {editMode ? (
                      <input
                        type="number"
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-full text-center text-pink-400"
                        value={row.endTime}
                        onChange={(e) => handleDraftChange(track.id, "endTime", e.target.value)}
                      />
                    ) : (
                      <span className="text-pink-400 text-sm tabular-nums">{track.endTime}</span>
                    )}
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
