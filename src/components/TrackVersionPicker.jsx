import React from "react";
import {
  applyActiveVersion,
  ensureTrackVersions,
  getVersionLabel,
} from "../lib/trackVersions";
import { useDropColors } from "../hooks/useDropColors";
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
  const { getCssVars } = useDropColors();
  const normalized = ensureTrackVersions(track);
  const versions = normalized.versions || [];

  if (versions.length <= 1) {
    const only = versions[0];
    if (!only) return null;
    const drop = only.drop?.trim() || getVersionLabel(only, 0, locale);
    return <DropTypeBadge drop={drop} compact={compact} className={className} />;
  }

  const currentId = activeVersionId || normalized.activeVersionId || normalized.defaultVersionId;

  return (
    <div
      className={`track-version-picker ${compact ? "is-compact" : ""} ${className}`}
      role="group"
      aria-label={t("trackVersion.chooseDrop")}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="track-version-picker-buttons">
        {versions.map((version, index) => {
          const isActive = version.id === currentId;
          const drop = version.drop?.trim() || getVersionLabel(version, index, locale);
          return (
            <button
              key={version.id}
              type="button"
              aria-pressed={isActive}
              title={version.isMissing ? t("trackSource.missing") : drop}
              className={`track-version-picker-btn ${isActive ? "is-active" : ""} ${
                version.isMissing ? "is-missing" : ""
              }`}
              style={getCssVars(drop)}
              onClick={() => onSelectVersion?.(track.id, version.id)}
            >
              <DropTypeBadge drop={drop} compact className="track-version-picker-btn-badge" />
              {version.isMissing ? (
                <span className="track-version-picker-missing" aria-hidden>
                  !
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function getTrackWithVersion(track, versionId) {
  return applyActiveVersion(track, versionId);
}
