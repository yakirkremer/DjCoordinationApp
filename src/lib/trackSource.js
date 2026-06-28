import { getLocalTrackUrl } from "./trackAudioUrl.js";
import { ensureTrackVersions } from "./trackVersions.js";

export function getTrackPlaybackUrl(track) {
  if (!track?.bucket || !track?.filename) return null;
  return getLocalTrackUrl(track);
}

export function getTrackDiskPath(track) {
  if (!track?.bucket || !track?.filename) return null;
  return `music/${track.bucket}/analyzed/${track.filename}`;
}

export function getTrackOriginPath(track) {
  return track?.dropboxSourcePath || track?.dropboxPath || null;
}

export function countMissingTracks(tracks) {
  return tracks.filter((t) => {
    const normalized = ensureTrackVersions(t);
    if (!normalized.versions.length) return true;
    return normalized.versions.every((v) => v.isMissing);
  }).length;
}

export function getTrackSourceSummary(track, t) {
  const label = (key) => (t ? t(`trackSource.${key}`) : null);
  const missingLabel = label("missing") ?? "קובץ חסר";
  const localLabel = label("local") ?? "זמין בשרת";
  const playbackUrl = getTrackPlaybackUrl(track);
  const diskPath = getTrackDiskPath(track);
  const originPath = getTrackOriginPath(track);

  if (track?.isMissing) {
    return {
      status: "missing",
      statusLabel: missingLabel,
      playbackUrl,
      diskPath,
      originPath,
      kindLabel: originPath ? "ייבוא Dropbox (קובץ לא נמצא בשרת)" : "קובץ מקומי (חסר)",
      alert: originPath
        ? `הקובץ לא נמצא בשרת. נגינה אמורה להיות מ: ${playbackUrl}`
        : `הקובץ לא נמצא בנתיב: ${diskPath}`,
    };
  }

  if (originPath) {
    return {
      status: "ok",
      statusLabel: localLabel,
      playbackUrl,
      diskPath,
      originPath,
      kindLabel: "ייבוא Dropbox → שרת",
      alert: null,
    };
  }

  return {
    status: "ok",
    statusLabel: localLabel,
    playbackUrl,
    diskPath,
    originPath: null,
    kindLabel: "העלאה / קובץ מקומי",
    alert: null,
  };
}
