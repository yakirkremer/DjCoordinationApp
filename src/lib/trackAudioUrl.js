import {
  getCachedAudioUrl,
  setCachedAudioUrl,
  warmAudioUrl,
} from "./audioUrlCache.js";

export function getLocalTrackUrl(track) {
  return `/music/${track.bucket}/analyzed/${encodeURIComponent(track.filename)}`;
}

export function usesDropboxStream(track, musicSource) {
  if (!track.dropboxPath) return false;
  return musicSource === "dropbox" || track.source === "dropbox";
}

async function fetchServerTemporaryLink(path) {
  try {
    const res = await fetch("/api/dropbox/temporary-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.link || null;
  } catch {
    return null;
  }
}

export async function resolveTrackAudioUrl(track, { musicSource, dropboxClient }) {
  const cached = getCachedAudioUrl(track);
  if (cached) return cached;

  if (!usesDropboxStream(track, musicSource)) {
    const url = getLocalTrackUrl(track);
    setCachedAudioUrl(track, url);
    return url;
  }

  const path = track.dropboxPath;
  const serverLink = await fetchServerTemporaryLink(path);
  if (serverLink) {
    setCachedAudioUrl(track, serverLink, Date.now() + 3 * 60 * 60 * 1000);
    return serverLink;
  }

  if (dropboxClient?.hasSession()) {
    const url = await dropboxClient.getTemporaryLink(path);
    setCachedAudioUrl(track, url, Date.now() + 3 * 60 * 60 * 1000);
    return url;
  }

  throw new Error("Dropbox not configured for streaming");
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
  context,
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
      const url = await resolveTrackAudioUrl(track, context);
      if (warm) warmAudioUrl(url);
    })
  );
}

export async function verifyLocalTrack(track) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(getLocalTrackUrl(track), {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
