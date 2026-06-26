export function getLocalTrackUrl(track) {
  return `/music/${track.bucket}/analyzed/${encodeURIComponent(track.filename)}`;
}

export function usesDropboxStream(track, musicSource) {
  if (!track.dropboxPath) return false;
  return musicSource === "dropbox" || track.source === "dropbox";
}

export async function resolveTrackAudioUrl(track, { musicSource, dropboxClient }) {
  if (!usesDropboxStream(track, musicSource)) {
    return getLocalTrackUrl(track);
  }

  const path = track.dropboxPath;

  const serverLink = await fetchServerTemporaryLink(path);
  if (serverLink) return serverLink;

  if (dropboxClient?.hasSession()) {
    return dropboxClient.getTemporaryLink(path);
  }

  throw new Error("Dropbox not configured for streaming");
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
