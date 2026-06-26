export async function analyzeDropboxTrack(dropboxPath, accessToken) {
  const res = await fetch("/api/dropbox/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: dropboxPath, accessToken }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Analysis failed (${res.status})`);
  }

  return res.json();
}
