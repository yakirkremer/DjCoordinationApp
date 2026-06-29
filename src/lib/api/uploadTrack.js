async function parseApiJson(res, fallbackMessage) {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    throw new Error(data.error || `${fallbackMessage} (${res.status})`);
  }
  if (!isJson) {
    throw new Error("API returned non-JSON response — is the backend running?");
  }
  return data;
}

export async function uploadTrack({ file, bucket, title, artist }) {
  const form = new FormData();
  form.append("file", file);
  form.append("bucket", bucket);
  if (title?.trim()) form.append("title", title.trim());
  if (artist?.trim()) form.append("artist", artist.trim());

  const res = await fetch("/api/music/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const data = await parseApiJson(res, "Upload failed");
  return data.track;
}

export async function addTrackVersion({ trackId, file, drop }) {
  const form = new FormData();
  form.append("file", file);
  form.append("trackId", trackId);
  if (!drop?.trim()) throw new Error("Drop type is required");
  form.append("drop", drop.trim());

  const res = await fetch("/api/music/add-version", {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const data = await parseApiJson(res, "Add version failed");
  return data.track;
}

export async function reloadTrackFile({ trackId, versionId, file, bucket, filename }) {
  const form = new FormData();
  form.append("file", file);
  form.append("trackId", trackId);
  if (versionId) form.append("versionId", versionId);
  if (bucket) form.append("bucket", bucket);
  if (filename) form.append("filename", filename);

  const res = await fetch("/api/music/reload", {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const data = await parseApiJson(res, "Reload failed");
  return data.track;
}

export async function deleteTrack(trackId) {
  const res = await fetch("/api/music/delete", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId }),
  });

  return parseApiJson(res, "Delete failed");
}

export async function deleteTrackVersion(trackId, versionId) {
  const res = await fetch("/api/music/delete-version", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId, versionId }),
  });

  const data = await parseApiJson(res, "Delete version failed");
  return data.track;
}

export async function reorderTrackVersions(trackId, versionOrder) {
  return updateTrack(trackId, { versionOrder });
}

export async function updateTrack(trackId, updates, versionId) {
  const res = await fetch("/api/music/update", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId, updates, versionId }),
  });

  const data = await parseApiJson(res, "Update failed");
  return data.track;
}
