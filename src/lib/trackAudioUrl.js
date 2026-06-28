import {
  getCachedAudioUrl,
  setCachedAudioUrl,
  warmAudioUrl,
} from "./audioUrlCache.js";

export function getLocalTrackUrl(track) {
  return `/music/${track.bucket}/analyzed/${encodeURIComponent(track.filename)}`;
}

export async function resolveTrackAudioUrl(track) {
  const cached = getCachedAudioUrl(track);
  if (cached) return cached;

  const url = getLocalTrackUrl(track);
  setCachedAudioUrl(track, url);
  return url;
}

function isAudioContentType(contentType) {
  const type = (contentType || "").toLowerCase();
  if (!type || type.includes("text/html")) return false;
  return (
    type.includes("audio/") ||
    type.includes("mpeg") ||
    type === "application/octet-stream"
  );
}

export async function verifyLocalTrack(track) {
  if (!track?.bucket || !track?.filename) return false;

  const url = getLocalTrackUrl(track);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const probe = async (init) => {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const contentType = response.headers.get("content-type") || "";
      const validType = isAudioContentType(contentType);
      const okStatus = response.ok || response.status === 206;

      if (!okStatus) return false;
      if (contentType && !validType) return false;
      return true;
    };

    let exists = await probe({ method: "HEAD" });

    if (!exists) {
      exists = await probe({
        method: "GET",
        headers: { Range: "bytes=0-0" },
      });
    }

    clearTimeout(timeout);
    return exists;
  } catch {
    return false;
  }
}

export async function verifyTracks(tracks) {
  const results = await Promise.all(
    tracks.map(async (track) => {
      const exists = await verifyLocalTrack(track);
      return { ...track, isMissing: !exists };
    })
  );
  return results;
}

function pickPreloadTracks(tracks, { aroundTrackId = null, limit = 8 } = {}) {
  const playable = tracks.filter((t) => t.isMissing !== true);
  if (playable.length === 0) return [];

  if (!aroundTrackId) {
    return playable.slice(0, limit);
  }

  const index = playable.findIndex((t) => t.id === aroundTrackId);
  if (index < 0) return playable.slice(0, limit);

  const start = Math.max(0, index - 2);
  return playable.slice(start, start + limit);
}

export async function preloadTrackAudioUrls(
  tracks,
  { aroundTrackId = null, limit = 8, warm = true } = {}
) {
  const candidates = pickPreloadTracks(tracks, { aroundTrackId, limit });
  if (candidates.length === 0) return;

  await Promise.allSettled(
    candidates.map(async (track) => {
      if (getCachedAudioUrl(track)) {
        if (warm) warmAudioUrl(getCachedAudioUrl(track));
        return;
      }
      const url = await resolveTrackAudioUrl(track);
      if (warm) warmAudioUrl(url);
    })
  );
}
