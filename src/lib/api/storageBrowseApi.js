async function parseJsonResponse(res, fallbackMessage) {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    throw new Error(data.error || `${fallbackMessage} (${res.status})`);
  }
  if (!isJson) {
    throw new Error("API returned non-JSON response");
  }
  return data;
}

export function fetchStorageDirectory(dir = "") {
  const q = dir ? `?dir=${encodeURIComponent(dir)}` : "";
  return fetch(`/api/admin/storage${q}`, { credentials: "include" }).then((res) =>
    parseJsonResponse(res, "Failed to list storage")
  );
}

export function fetchStorageFile(filePath) {
  const q = `?path=${encodeURIComponent(filePath)}`;
  return fetch(`/api/admin/storage/file${q}`, { credentials: "include" }).then((res) =>
    parseJsonResponse(res, "Failed to read file")
  );
}

export function getStorageDownloadUrl(filePath) {
  return `/api/admin/storage/download?path=${encodeURIComponent(filePath)}`;
}
