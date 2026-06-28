import React, { useState } from "react";
import {
  applyActiveVersion,
  ensureTrackVersions,
  getVersionLabel,
} from "../lib/trackVersions";
import { getDropTypeCssVars } from "../lib/dropTypeColors";
import DropTypeBadge from "./DropTypeBadge";
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
    const drop = only.drop?.trim() || getVersionLabel(only, 0, locale);
    return <DropTypeBadge drop={drop} compact={compact} className={className} />;
  }

  const currentId = activeVersionId || normalized.activeVersionId || normalized.defaultVersionId;
  const currentIndex = versions.findIndex((v) => v.id === currentId);
  const current = versions[currentIndex] || versions[0];
  const currentDrop = current.drop?.trim() || getVersionLabel(current, Math.max(0, currentIndex), locale);

  return (
    <div className={`track-version-picker ${compact ? "is-compact" : ""} ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="track-version-picker-toggle"
        style={getDropTypeCssVars(currentDrop)}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <DropTypeBadge drop={currentDrop} compact className="track-version-picker-badge" />
        <span className={`track-version-picker-chevron ${open ? "is-open" : ""}`}>▼</span>
        {current.isMissing ? (
          <span className="track-version-picker-missing">!</span>
        ) : null}
      </button>
      {open ? (
        <ul className="track-version-picker-menu" role="listbox">
          {versions.map((version, index) => {
            const isActive = version.id === currentId;
            const drop = version.drop?.trim() || getVersionLabel(version, index, locale);
            return (
              <li key={version.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`track-version-picker-item ${isActive ? "is-active" : ""} ${
                    version.isMissing ? "is-missing" : ""
                  }`}
                  style={getDropTypeCssVars(drop)}
                  onClick={() => {
                    onSelectVersion?.(track.id, version.id);
                    setOpen(false);
                  }}
                >
                  <DropTypeBadge drop={drop} compact className="track-version-picker-item-badge" />
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
