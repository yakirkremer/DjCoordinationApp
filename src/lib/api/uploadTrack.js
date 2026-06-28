export async function uploadTrack({ file, bucket, title, artist }) {
  const form = new FormData();
  form.append("file", file);
  form.append("bucket", bucket);
  if (title?.trim()) form.append("title", title.trim());
  if (artist?.trim()) form.append("artist", artist.trim());

  const res = await fetch("/api/music/upload", {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }

  return data.track;
}

export async function reloadTrackFile({ trackId, file, bucket, filename }) {
  const form = new FormData();
  form.append("file", file);
  form.append("trackId", trackId);
  if (bucket) form.append("bucket", bucket);
  if (filename) form.append("filename", filename);

  const res = await fetch("/api/music/reload", {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Reload failed (${res.status})`);
  }

  return data.track;
}

export async function deleteTrack(trackId) {
  const res = await fetch("/api/music/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Delete failed (${res.status})`);
  }

  return data;
}

export async function updateTrack(trackId, updates) {
  const res = await fetch("/api/music/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId, updates }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Update failed (${res.status})`);
  }

  return data.track;
}
