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

export async function fetchCatalogArtwork({ force = false, trackId = null } = {}) {
  const res = await fetch("/api/admin/fetch-artwork", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ force, ...(trackId ? { trackId } : {}) }),
  });

  return parseApiJson(res, "Artwork fetch failed");
}
