import { getLocalTrackUrl } from "./trackAudioUrl.js";

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

export function getTrackSourceSummary(track) {
  const playbackUrl = getTrackPlaybackUrl(track);
  const diskPath = getTrackDiskPath(track);
  const originPath = getTrackOriginPath(track);

  if (track?.isMissing) {
    return {
      status: "missing",
      statusLabel: "קובץ חסר",
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
      statusLabel: "זמין בשרת",
      playbackUrl,
      diskPath,
      originPath,
      kindLabel: "ייבוא Dropbox → שרת",
      alert: null,
    };
  }

  return {
    status: "ok",
    statusLabel: "זמין בשרת",
    playbackUrl,
    diskPath,
    originPath: null,
    kindLabel: "העלאה / קובץ מקומי",
    alert: null,
  };
}

export function countMissingTracks(tracks) {
  return tracks.filter((t) => t.isMissing === true).length;
}
