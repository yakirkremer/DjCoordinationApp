import React, { useState } from "react";
import TrackReloadButton from "./TrackReloadButton";
import TrackAddVersionForm from "./TrackAddVersionForm";
import DropTypeSelect from "./DropTypeSelect";
import DropTypeBadge from "./DropTypeBadge";
import { useDropColors } from "../hooks/useDropColors";
import TrackVersionPicker, { getTrackWithVersion } from "./TrackVersionPicker";
import { ensureTrackVersions, getVersionLabel } from "../lib/trackVersions";
import { getTrackSourceSummary } from "../lib/trackSource";
import { useI18n } from "../lib/i18n/AppSettingsContext";
import { updateTrack, deleteTrackVersion, reorderTrackVersions } from "../lib/api/uploadTrack";

export default function AdminTrackVersions({
  track,
  currentTrack,
  activeVersionId,
  onSelectVersion,
  onPreviewTrack,
  onTrackSaved,
  onTrackReloaded,
}) {
  const { t, locale, dir } = useI18n();
  const { getCssVars } = useDropColors();
  const normalized = ensureTrackVersions(track);
  const versions = normalized.versions || [];
  const [savingVersionId, setSavingVersionId] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [versionDrafts, setVersionDrafts] = useState({});
  const [versionError, setVersionError] = useState({});

  const getVersionDraft = (version) => {
    const base = {
      drop: version.drop ?? "",
      filename: version.filename ?? "",
      startTime: version.startTime ?? 0,
      endTime: version.endTime ?? 0,
    };
    return versionDrafts[version.id] ? { ...base, ...versionDrafts[version.id] } : base;
  };

  const handleVersionDraftChange = (versionId, field, value) => {
    const version = versions.find((v) => v.id === versionId);
    if (!version) return;
    setVersionError((prev) => ({ ...prev, [versionId]: "" }));
    setVersionDrafts((prev) => ({
      ...prev,
      [versionId]: { ...getVersionDraft(version), [field]: value },
    }));
  };

  const handleSaveVersion = async (version) => {
    const draft = getVersionDraft(version);
    setSavingVersionId(version.id);
    try {
      const saved = await updateTrack(
        track.id,
        {
          drop: draft.drop,
          filename: draft.filename,
          startTime: draft.startTime,
          endTime: draft.endTime,
        },
        version.id
      );
      onTrackSaved?.(saved);
      setVersionDrafts((prev) => {
        const next = { ...prev };
        delete next[version.id];
        return next;
      });
    } catch (err) {
      setVersionError((prev) => ({ ...prev, [version.id]: err.message }));
    } finally {
      setSavingVersionId(null);
    }
  };

  const handleDeleteVersion = async (versionId) => {
    if (!window.confirm(t("admin.deleteVersionConfirm"))) return;
    try {
      const saved = await deleteTrackVersion(track.id, versionId);
      onTrackSaved?.(saved);
    } catch (err) {
      window.alert(err.message || t("admin.deleteFailed"));
    }
  };

  const handleMoveVersion = async (versionId, direction) => {
    const idx = versions.findIndex((v) => v.id === versionId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= versions.length) return;

    const order = versions.map((v) => v.id);
    [order[idx], order[targetIdx]] = [order[targetIdx], order[idx]];

    setReordering(true);
    try {
      const saved = await reorderTrackVersions(track.id, order);
      onTrackSaved?.(saved);
    } catch (err) {
      window.alert(err.message || t("admin.reorderVersionsFailed"));
    } finally {
      setReordering(false);
    }
  };

  return (
    <tr className="admin-version-row bg-black/30">
      <td colSpan={7} className="p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-3" dir={dir}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="font-lcd text-[10px] text-xdj-muted uppercase">
                {t("admin.versionsCount", { count: versions.length })}
              </p>
              {versions.length > 1 ? (
                <p className="text-[10px] text-xdj-muted mt-0.5">{t("admin.versionOrderHint")}</p>
              ) : null}
            </div>
            <TrackVersionPicker
              track={track}
              activeVersionId={activeVersionId}
              onSelectVersion={onSelectVersion}
            />
          </div>

          <div className="admin-version-list flex flex-col gap-2">
            {versions.map((version, index) => {
              const draft = getVersionDraft(version);
              const playbackTrack = getTrackWithVersion(track, version.id);
              const source = getTrackSourceSummary(playbackTrack, t);
              const isActive =
                (activeVersionId || normalized.activeVersionId) === version.id;
              const isSelected = currentTrack?.id === track.id && isActive;
              const isDefault = index === 0;

              return (
                <div
                  key={version.id}
                  className={`admin-version-card rounded-sm border p-3 ${
                    isSelected ? "border-xdj-cyan/60 bg-xdj-cyan/5" : "border-xdj-border"
                  } ${isDefault ? "admin-version-card--default" : ""}`}
                  style={getCssVars(version.drop)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2 min-w-0">
                      {versions.length > 1 ? (
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveVersion(version.id, "up")}
                            disabled={index === 0 || reordering}
                            className="admin-version-reorder-btn"
                            aria-label={t("admin.moveVersionUp")}
                            title={t("admin.moveVersionUp")}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveVersion(version.id, "down")}
                            disabled={index === versions.length - 1 || reordering}
                            className="admin-version-reorder-btn"
                            aria-label={t("admin.moveVersionDown")}
                            title={t("admin.moveVersionDown")}
                          >
                            ▼
                          </button>
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <DropTypeBadge drop={version.drop || getVersionLabel(version, index, locale)} />
                          {isDefault ? (
                            <span className="admin-version-default-badge">{t("admin.defaultVersion")}</span>
                          ) : null}
                        </div>
                        <p className="text-[10px] text-xdj-muted font-mono truncate">{version.filename}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => onPreviewTrack(getTrackWithVersion(track, version.id), { play: true })}
                        disabled={version.isMissing}
                        className="text-[10px] px-2 py-1 rounded border border-xdj-cyan/40 text-xdj-cyan disabled:opacity-40"
                      >
                        {t("admin.colPreview")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectVersion(track.id, version.id)}
                        className={`text-[10px] px-2 py-1 rounded border ${
                          isActive ? "border-xdj-gold text-xdj-gold" : "border-xdj-border text-xdj-muted"
                        }`}
                      >
                        {t("admin.useVersion")}
                      </button>
                      {versions.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteVersion(version.id)}
                          className="text-[10px] px-2 py-1 rounded border border-red-500/50 text-red-300"
                        >
                          {t("admin.deleteVersion")}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-2">
                    <DropTypeSelect
                      value={draft.drop}
                      onChange={(value) => handleVersionDraftChange(version.id, "drop", value)}
                      className="input-luxury px-2 py-1 text-xs rounded-sm"
                    />
                    <input
                      className="input-luxury px-2 py-1 text-xs rounded-sm font-mono col-span-2"
                      value={draft.filename}
                      onChange={(e) => handleVersionDraftChange(version.id, "filename", e.target.value)}
                    />
                    <input
                      type="number"
                      className="input-luxury px-2 py-1 text-xs rounded-sm"
                      value={draft.startTime}
                      onChange={(e) => handleVersionDraftChange(version.id, "startTime", e.target.value)}
                    />
                    <input
                      type="number"
                      className="input-luxury px-2 py-1 text-xs rounded-sm"
                      value={draft.endTime}
                      onChange={(e) => handleVersionDraftChange(version.id, "endTime", e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <DropTypeBadge drop={draft.drop} compact />
                    <span className="text-[10px] text-xdj-muted">
                      {draft.startTime}s–{draft.endTime}s
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        source.status === "missing"
                          ? "text-red-300 bg-red-950 border-red-800"
                          : "text-xdj-cyan bg-xdj-cyan/10 border-xdj-cyan/30"
                      }`}
                    >
                      {source.statusLabel}
                    </span>
                    <div className="flex gap-2">
                      <TrackReloadButton
                        track={track}
                        versionId={version.id}
                        onReloaded={onTrackReloaded}
                        compact
                        label={version.isMissing ? t("admin.reload") : t("admin.replace")}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveVersion(version)}
                        disabled={savingVersionId === version.id}
                        className="text-[10px] font-bold text-xdj-cyan px-2 py-1 rounded border border-xdj-cyan/50 disabled:opacity-40"
                      >
                        {savingVersionId === version.id ? t("common.saving") : t("admin.saveRow")}
                      </button>
                    </div>
                  </div>
                  {versionError[version.id] ? (
                    <p className="text-[10px] text-xdj-orange mt-1">{versionError[version.id]}</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <TrackAddVersionForm track={track} onAdded={onTrackSaved} />
        </div>
      </td>
    </tr>
  );
}
