import React, { useState } from "react";
import {
  applyActiveVersion,
  ensureTrackVersions,
  getVersionLabel,
} from "../lib/trackVersions";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function TrackVersionPicker({
  track,
  activeVersionId,
  onSelectVersion,
  compact = false,
  className = "",
}) {
  const { locale, t } = useI18n();
  const normalized = ensureTrackVersions(track);
  const versions = normalized.versions || [];
  const [open, setOpen] = useState(false);

  if (versions.length <= 1) {
    const only = versions[0];
    if (!only) return null;
    const label = getVersionLabel(only, 0, locale);
    return (
      <span className={`text-[10px] text-xdj-muted ${className}`}>
        {label}
      </span>
    );
  }

  const currentId = activeVersionId || normalized.activeVersionId || normalized.defaultVersionId;
  const currentIndex = versions.findIndex((v) => v.id === currentId);
  const current = versions[currentIndex] || versions[0];
  const currentLabel = getVersionLabel(current, Math.max(0, currentIndex), locale);

  return (
    <div className={`track-version-picker ${compact ? "is-compact" : ""} ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="track-version-picker-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="track-version-picker-label">{currentLabel}</span>
        <span className={`track-version-picker-chevron ${open ? "is-open" : ""}`}>▼</span>
        {current.isMissing ? (
          <span className="track-version-picker-missing">!</span>
        ) : null}
      </button>
      {open ? (
        <ul className="track-version-picker-menu" role="listbox">
          {versions.map((version, index) => {
            const isActive = version.id === currentId;
            return (
              <li key={version.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`track-version-picker-item ${isActive ? "is-active" : ""} ${
                    version.isMissing ? "is-missing" : ""
                  }`}
                  onClick={() => {
                    onSelectVersion?.(track.id, version.id);
                    setOpen(false);
                  }}
                >
                  <span>{getVersionLabel(version, index, locale)}</span>
                  {version.isMissing ? (
                    <span className="text-[10px] text-red-400">{t("trackSource.missing")}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function getTrackWithVersion(track, versionId) {
  return applyActiveVersion(track, versionId);
}
