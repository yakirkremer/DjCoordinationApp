const urlCache = new Map();
const warmingUrls = new Set();

export function getTrackCacheKey(track) {
  if (track?.bucket && track?.filename) {
    return `local:${track.bucket}/${track.filename}`;
  }
  return null;
}

export function getCachedAudioUrl(track) {
  const key = getTrackCacheKey(track);
  if (!key) return null;

  const entry = urlCache.get(key);
  if (!entry) return null;

  return entry.url;
}

export function setCachedAudioUrl(track, url) {
  const key = getTrackCacheKey(track);
  if (!key || !url) return;
  urlCache.set(key, { url });
}

export function warmAudioUrl(url) {
  if (!url || warmingUrls.has(url)) return;

  warmingUrls.add(url);
  const audio = new Audio();
  audio.preload = "auto";

  const done = () => {
    warmingUrls.delete(url);
    audio.removeEventListener("canplaythrough", done);
    audio.removeEventListener("error", done);
  };

  audio.addEventListener("canplaythrough", done, { once: true });
  audio.addEventListener("error", done, { once: true });
  audio.src = url;
  audio.load();
}
