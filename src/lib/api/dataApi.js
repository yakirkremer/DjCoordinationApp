async function request(path, options = {}) {
  const res = await fetch(`/api/data/${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    const err = isJson ? await res.json().catch(() => ({})) : {};
    throw new Error(err.error || `Request failed (${res.status})`);
  }

  if (res.status === 204) return null;
  if (!isJson) {
    throw new Error("API returned non-JSON response — is the backend running?");
  }
  return res.json();
}

export function fetchClients() {
  return request("clients");
}

export function saveClients(clients) {
  return request("clients", { method: "PUT", body: JSON.stringify(clients) });
}

export function fetchFormSchema() {
  return request("form-schema");
}

export function saveFormSchema(schema) {
  return request("form-schema", { method: "PUT", body: JSON.stringify(schema) });
}

export function fetchFeedback(clientId) {
  const q = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
  return request(`feedback${q}`);
}

export function saveFeedback(clientId, data) {
  return request("feedback", {
    method: "PUT",
    body: JSON.stringify({ clientId, data }),
  });
}

export function deleteFeedback(clientId) {
  return request("feedback", {
    method: "PUT",
    body: JSON.stringify({ clientId, data: null }),
  });
}

export function fetchCatalog() {
  return request("catalog");
}

export function saveCatalog(tracks) {
  return request("catalog", { method: "PUT", body: JSON.stringify(tracks) });
}

export function fetchCatalogMigrationExport() {
  return request("catalog-export");
}

export async function downloadCatalogMigrationZip() {
  const res = await fetch("/api/admin/catalog-export-zip", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) message = err.error;
    } catch {
      // ignore non-json error body
    }
    throw new Error(message);
  }
  return res.blob();
}

export function fetchAppSettings() {
  return request("settings");
}

export function saveAppSettings(settings) {
  return request("settings", { method: "PUT", body: JSON.stringify(settings) });
}
