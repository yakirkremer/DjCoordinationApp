async function request(path, options = {}) {
  const res = await fetch(`/api/contracts${path}`, {
    credentials: "include",
    ...options,
    headers: { ...options.headers },
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    const err = isJson ? await res.json().catch(() => ({})) : {};
    throw new Error(err.error || `Request failed (${res.status})`);
  }

  if (!isJson) {
    throw new Error("API returned non-JSON response");
  }
  return res.json();
}

export function fetchContracts() {
  return request("");
}

export function saveContracts(data) {
  return request("", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function fetchClientContract() {
  return request("");
}

export function signContract(ticketId, values) {
  return request(`/tickets/${encodeURIComponent(ticketId)}/sign`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
}

export async function uploadContractTemplate(file, name) {
  const form = new FormData();
  form.append("file", file);
  if (name?.trim()) form.append("name", name.trim());

  const res = await fetch("/api/contracts/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return data;
}

export function generateTicketId() {
  return `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateFieldId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const FIELD_TYPES = [
  { id: "text", label: "שם / טקסט", icon: "✏️" },
  { id: "date", label: "תאריך", icon: "📅" },
  { id: "checkbox", label: "תיבת סימון", icon: "☑️" },
  { id: "signature", label: "חתימה", icon: "✍️" },
];

export const DEFAULT_FIELD_SIZE = {
  text: { width: 18, height: 3 },
  date: { width: 14, height: 3 },
  checkbox: { width: 3, height: 3 },
  signature: { width: 22, height: 8 },
};
