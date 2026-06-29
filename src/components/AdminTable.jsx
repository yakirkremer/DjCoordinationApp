import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useGenres } from "../hooks/useGenres";
import TrackReloadButton from "./TrackReloadButton";
import TrackVersionPicker from "./TrackVersionPicker";
import AdminTrackVersions from "./AdminTrackVersions";
import DropTypeSelect from "./DropTypeSelect";
import { countMissingTracks, getTrackSourceSummary } from "../lib/trackSource";
import { ensureTrackVersions } from "../lib/trackVersions";
import { useI18n } from "../lib/i18n/AppSettingsContext";
import { updateTrack } from "../lib/api/uploadTrack";

const EDITABLE_FIELDS = ["title", "artist", "bucket"];

function pickEditable(track, genres) {
  return {
    title: track.title ?? "",
    artist: track.artist ?? "",
    bucket: track.bucket ?? genres[0] ?? "",
  };
}

function draftsEqual(a, b) {
  return EDITABLE_FIELDS.every((key) => String(a[key]) === String(b[key]));
}

export default function AdminTable({
  tracks,
  currentTrack,
  activeVersionIds = {},
  onSelectVersion,
  onTrackSaved,
  onDeleteTrack,
  onPreviewTrack,
  onTrackReloaded,
  onRefreshTrackFiles,
}) {
  const { t, dir } = useI18n();
  const genres = useGenres();
  const missingCount = countMissingTracks(tracks);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [rowError, setRowError] = useState({});
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkGenre, setBulkGenre] = useState("");
  const [bulkDrop, setBulkDrop] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkError, setBulkError] = useState("");

  const selectedCount = selectedIds.size;
  const allSelected = tracks.length > 0 && selectedCount === tracks.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleSelected = (trackId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
    setBulkMessage("");
    setBulkError("");
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tracks.map((t) => t.id)));
    }
    setBulkMessage("");
    setBulkError("");
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkMessage("");
    setBulkError("");
  };

  const clearDraftField = (trackId, field) => {
    setDrafts((prev) => {
      if (!prev[trackId]?.[field]) return prev;
      const next = { ...prev, [trackId]: { ...prev[trackId] } };
      delete next[trackId][field];
      if (Object.keys(next[trackId]).length === 0) {
        const copy = { ...next };
        delete copy[trackId];
        return copy;
      }
      return next;
    });
  };

  const resolveActiveVersionId = useCallback(
    (track) => {
      const normalized = ensureTrackVersions(track);
      return activeVersionIds[track.id] || normalized.activeVersionId || normalized.versions?.[0]?.id;
    },
    [activeVersionIds]
  );

  const handleBulkApplyGenre = async () => {
    const genreToApply = bulkGenre || defaultBulkGenre;
    if (!genreToApply || selectedCount === 0 || bulkApplying) return;
    setBulkApplying(true);
    setBulkMessage("");
    setBulkError("");

    let ok = 0;
    const failed = [];

    for (const id of selectedIds) {
      const track = tracks.find((tr) => tr.id === id);
      if (!track) continue;
      if (track.bucket === genreToApply) {
        ok += 1;
        continue;
      }
      try {
        const saved = await updateTrack(id, { bucket: genreToApply });
        onTrackSaved?.(saved);
        clearDraftField(id, "bucket");
        ok += 1;
      } catch (err) {
        failed.push({ id, label: track.title || id, error: err.message || t("admin.saveFailed") });
      }
    }

    setBulkApplying(false);
    if (failed.length === 0) {
      setBulkMessage(t("admin.bulkGenreDone", { count: ok }));
    } else {
      setBulkError(
        `${t("admin.bulkPartial", { ok, fail: failed.length })} — ${failed
          .slice(0, 2)
          .map((f) => f.label)
          .join(", ")}${failed.length > 2 ? "…" : ""}`
      );
      if (ok > 0) setBulkMessage(t("admin.bulkGenreDone", { count: ok }));
    }
  };

  const handleBulkApplyDrop = async () => {
    if (!bulkDrop?.trim() || selectedCount === 0 || bulkApplying) return;
    const dropLabel = bulkDrop.trim();
    setBulkApplying(true);
    setBulkMessage("");
    setBulkError("");

    let ok = 0;
    const failed = [];

    for (const id of selectedIds) {
      const track = tracks.find((tr) => tr.id === id);
      if (!track) continue;
      const normalized = ensureTrackVersions(track);
      const versionId = resolveActiveVersionId(track);
      const version = normalized.versions?.find((v) => v.id === versionId);
      if (!version) {
        failed.push({ label: track.title || id, error: t("admin.saveFailed") });
        continue;
      }

      const hasConflict = normalized.versions.some(
        (v) =>
          v.id !== versionId &&
          String(v.drop || "")
            .trim()
            .toLowerCase() === dropLabel.toLowerCase()
      );
      if (hasConflict) {
        failed.push({ label: track.title || id, error: t("admin.duplicateDrop") });
        continue;
      }

      if (String(version.drop || "").trim() === dropLabel) {
        ok += 1;
        continue;
      }

      try {
        const saved = await updateTrack(id, { drop: dropLabel }, versionId);
        onTrackSaved?.(saved);
        ok += 1;
      } catch (err) {
        failed.push({ label: track.title || id, error: err.message || t("admin.saveFailed") });
      }
    }

    setBulkApplying(false);
    if (failed.length === 0) {
      setBulkMessage(t("admin.bulkDropDone", { count: ok }));
    } else {
      setBulkError(
        `${t("admin.bulkPartial", { ok, fail: failed.length })} — ${failed
          .slice(0, 2)
          .map((f) => `${f.label}: ${f.error}`)
          .join(" · ")}${failed.length > 2 ? "…" : ""}`
      );
      if (ok > 0) setBulkMessage(t("admin.bulkDropDone", { count: ok }));
    }
  };

  const defaultBulkGenre = useMemo(() => genres[0] ?? "", [genres]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(tracks.map((t) => t.id));
      let changed = false;
      const next = new Set();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [tracks]);

  const getDraft = useCallback(
    (track) => {
      if (drafts[track.id]) {
        return { ...pickEditable(track, genres), ...drafts[track.id] };
      }
      return pickEditable(track, genres);
    },
    [drafts, genres]
  );

  const isRowDirty = (track) => {
    const draft = drafts[track.id];
    if (!draft) return false;
    return !draftsEqual(draft, pickEditable(track, genres));
  };

  const handleDraftChange = (id, field, value) => {
    setRowError((prev) => ({ ...prev, [id]: "" }));
    setDrafts((prev) => {
      const base = prev[id] ?? pickEditable(tracks.find((tr) => tr.id === id) ?? {}, genres);
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
    const original = pickEditable(track, genres);
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

  const toggleExpanded = (trackId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
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

      {selectedCount > 0 ? (
        <div className="admin-catalog-bulk-bar" dir={dir} onClick={(e) => e.stopPropagation()}>
          <span className="admin-catalog-bulk-count">{t("admin.bulkSelected", { count: selectedCount })}</span>

          <div className="admin-catalog-bulk-group">
            <span className="admin-catalog-bulk-label">{t("admin.bulkSetGenre")}</span>
            <select
              value={bulkGenre || defaultBulkGenre}
              onChange={(e) => setBulkGenre(e.target.value)}
              disabled={bulkApplying}
              className="admin-catalog-bulk-select bg-gray-800 text-xs rounded px-2 py-1 outline-none border border-gray-700 text-gray-200"
            >
              {genres.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBulkApplyGenre}
              disabled={bulkApplying}
              className="text-[10px] px-2 py-1 rounded border border-xdj-cyan/50 text-xdj-cyan hover:bg-xdj-cyan/10 disabled:opacity-40"
            >
              {bulkApplying ? t("admin.bulkApplying") : t("admin.bulkApplyGenre")}
            </button>
          </div>

          <div className="admin-catalog-bulk-group">
            <span className="admin-catalog-bulk-label">{t("admin.bulkSetDrop")}</span>
            <DropTypeSelect
              value={bulkDrop}
              onChange={setBulkDrop}
              disabled={bulkApplying}
              className="admin-catalog-bulk-select input-luxury px-2 py-1 text-xs rounded-sm"
            />
            <button
              type="button"
              onClick={handleBulkApplyDrop}
              disabled={bulkApplying || !bulkDrop?.trim()}
              className="text-[10px] px-2 py-1 rounded border border-xdj-gold/50 text-xdj-gold hover:bg-xdj-gold/10 disabled:opacity-40"
            >
              {bulkApplying ? t("admin.bulkApplying") : t("admin.bulkApplyDrop")}
            </button>
          </div>

          <button
            type="button"
            onClick={clearSelection}
            disabled={bulkApplying}
            className="text-[10px] text-xdj-muted hover:text-xdj-text ms-auto disabled:opacity-40"
          >
            {t("admin.bulkClearSelection")}
          </button>

          {bulkMessage ? <span className="text-[10px] text-xdj-cyan w-full">{bulkMessage}</span> : null}
          {bulkError ? <span className="text-[10px] text-xdj-orange w-full">{bulkError}</span> : null}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="admin-catalog-table w-full min-w-[1100px] text-right border-collapse">
          <colgroup>
            <col className="admin-col-select" />
            <col className="admin-col-preview" />
            <col className="admin-col-actions" />
            <col className="admin-col-title" />
            <col className="admin-col-versions" />
            <col className="admin-col-source" />
            <col className="admin-col-bucket" />
          </colgroup>
          <thead>
            <tr className="xdj-browser-columns text-xs">
              <th className="p-4 text-center">
                <input
                  type="checkbox"
                  className="admin-catalog-row-check"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  aria-label={t("admin.bulkSelectAll")}
                />
              </th>
              <th className="p-4 text-center">{t("admin.colPreview")}</th>
              <th className="p-4 text-center sticky right-0 z-10 bg-xdj-panel/95 backdrop-blur-sm shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                {t("admin.colActions")}
              </th>
              <th className="p-4">{t("admin.colTitle")}</th>
              <th className="p-4">{t("admin.colVersions")}</th>
              <th className="p-4">{t("admin.colSource")}</th>
              <th className="p-4">{t("admin.colBucket")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-xdj-border/30">
            {tracks.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <p className="font-lcd text-xs text-xdj-muted">{t("admin.emptyTable")}</p>
                  <p className="text-xs text-xdj-muted mt-2">{t("admin.emptyTableHint")}</p>
                </td>
              </tr>
            ) : null}
            {tracks.map((track) => {
              const normalized = ensureTrackVersions(track);
              const row = getDraft(track);
              const isSelected = currentTrack?.id === track.id;
              const activeVersionId = activeVersionIds[track.id] || normalized.activeVersionId;
              const canPreview = !track.isMissing;
              const needsReload = track.isMissing === true;
              const source = getTrackSourceSummary(track, t);
              const dirty = isRowDirty(track);
              const saving = savingId === track.id;
              const isExpanded = expandedIds.has(track.id);
              const versionCount = normalized.versions?.length ?? 1;
              const isChecked = selectedIds.has(track.id);

              return (
                <React.Fragment key={track.id}>
                <tr
                  onClick={() => onPreviewTrack(track)}
                  className={`xdj-browser-row transition-colors cursor-pointer ${
                    isSelected ? "bg-xdj-cyan/10 ring-1 ring-inset ring-xdj-cyan/30" : "hover:bg-xdj-cyan/5"
                  } ${needsReload ? "bg-red-950/20 opacity-80" : ""} ${dirty ? "ring-1 ring-inset ring-xdj-gold/40" : ""} ${
                    isChecked ? "bg-xdj-gold/5" : ""
                  }`}
                >
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="admin-catalog-row-check"
                      checked={isChecked}
                      onChange={() => toggleSelected(track.id)}
                      aria-label={track.title || track.id}
                    />
                  </td>
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
                      {dirty ? (
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
                          versionId={activeVersionId}
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
                  <td className="p-3 admin-col-title-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col w-full min-w-0">
                      <div className="flex items-start gap-2">
                        <input
                          className="admin-col-title-input bg-transparent border-b border-xdj-border focus:border-xdj-cyan outline-none w-full font-bold text-gray-200"
                          value={row.title}
                          onChange={(e) => handleDraftChange(track.id, "title", e.target.value)}
                        />
                        {track.isMissing && (
                          <span className="text-[10px] text-red-400 font-bold bg-red-950 px-1.5 py-0.5 rounded border border-red-900 shadow-sm shrink-0">
                            {t("trackSource.missing")}
                          </span>
                        )}
                      </div>
                      <input
                        className="bg-transparent text-xs text-gray-500 border-b border-xdj-border focus:border-xdj-cyan outline-none w-full mt-1"
                        value={row.artist}
                        onChange={(e) => handleDraftChange(track.id, "artist", e.target.value)}
                      />
                      <div className="mt-2">
                        <TrackVersionPicker
                          track={track}
                          activeVersionId={activeVersionId}
                          onSelectVersion={onSelectVersion}
                          compact
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(track.id)}
                      className={`text-[10px] px-2 py-1 rounded border w-full min-h-[32px] ${
                        isExpanded ? "border-xdj-gold text-xdj-gold" : "border-xdj-border text-xdj-muted"
                      }`}
                    >
                      {versionCount} {t("admin.versionsShort")} {isExpanded ? "▲" : "▼"}
                    </button>
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
                    <select
                      className="bg-gray-800 text-xs rounded px-2 py-1 outline-none border border-gray-700 text-gray-200"
                      value={row.bucket}
                      onChange={(e) => handleDraftChange(track.id, "bucket", e.target.value)}
                    >
                      {genres.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
                {isExpanded ? (
                  <AdminTrackVersions
                    track={track}
                    currentTrack={currentTrack}
                    activeVersionId={activeVersionId}
                    onSelectVersion={onSelectVersion}
                    onPreviewTrack={onPreviewTrack}
                    onTrackSaved={onTrackSaved}
                    onTrackReloaded={onTrackReloaded}
                  />
                ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
