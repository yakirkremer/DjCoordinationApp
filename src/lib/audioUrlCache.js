const urlCache = new Map();
const warmingUrls = new Set();

export function getTrackCacheKey(track) {
  if (track?.bucket && track?.filename) {
    const version = track.audioVersion ? `:v${track.audioVersion}` : "";
    const verId = track.activeVersionId ? `:ver${track.activeVersionId}` : "";
    return `local:${track.bucket}/${track.filename}${verId}${version}`;
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
  const done = () => {
    warmingUrls.delete(url);
  };

  // Prime the HTTP cache with the first chunk — enough to start playback quickly.
  fetch(url, {
    credentials: "include",
    headers: { Range: "bytes=0-262143" },
  })
    .then((res) => {
      if (!res.ok && res.status !== 206) throw new Error(`warm failed (${res.status})`);
      return res.arrayBuffer();
    })
    .then(done)
    .catch(done);
}
