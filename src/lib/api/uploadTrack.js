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
