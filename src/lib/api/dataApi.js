async function request(path, options = {}) {
  const res = await fetch(`/api/data/${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }

  if (res.status === 204) return null;
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
