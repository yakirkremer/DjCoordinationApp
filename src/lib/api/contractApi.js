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

import { pickCanonicalTicketForClient } from "../contractTickets";

function attachPublicTemplate(ticket, templates = []) {
  if (!ticket) return null;
  const template = templates.find((t) => t.id === ticket.templateId);
  if (!template) return { ...ticket, template: null };
  const base = {
    id: template.id,
    name: template.name,
    sourceType: template.sourceType || "docx",
    fields: template.fields ?? [],
    detailSync: template.detailSync ?? {},
  };
  const publicTemplate =
    base.sourceType === "pdf"
      ? { ...base, fileUrl: `/api/contracts/templates/${template.id}/file` }
      : { ...base, html: template.html };
  return { ...ticket, template: publicTemplate };
}

export async function fetchClientContract(clientId) {
  const data = await request("");
  if (data.ticket !== undefined) {
    return { ticket: data.ticket ?? null };
  }
  if (clientId && Array.isArray(data.tickets)) {
    const ticket = pickCanonicalTicketForClient(data.tickets, clientId);
    return { ticket: attachPublicTemplate(ticket, data.templates) };
  }
  return { ticket: null };
}

export function assignContractTicket(clientId, templateId, clientProfile = null) {
  return request("/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, templateId, clientProfile }),
  });
}

export function syncTicketClientDetails(ticketId) {
  return request(`/tickets/${encodeURIComponent(ticketId)}/sync-client`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

export function updateTicketAdminValues(ticketId, values) {
  return request(`/tickets/${encodeURIComponent(ticketId)}/values`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
}

export function signContract(ticketId, values) {
  return request(`/tickets/${encodeURIComponent(ticketId)}/sign`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
}

export function fetchContractByLink(signToken) {
  return fetch(`/api/contracts/link/${encodeURIComponent(signToken)}`)
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    });
}

export function signContractByLink(signToken, values) {
  return fetch(`/api/contracts/link/${encodeURIComponent(signToken)}/sign`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  });
}

export function getContractTemplateFileUrl(templateId, signToken) {
  const base = `/api/contracts/templates/${encodeURIComponent(templateId)}/file`;
  if (!signToken) return base;
  return `${base}?signToken=${encodeURIComponent(signToken)}`;
}

export function getSignedCopyDownloadUrl(ticketId, format, signToken) {
  const params = new URLSearchParams();
  if (format) params.set("format", format);
  if (signToken) params.set("signToken", signToken);
  const query = params.toString();
  const base = `/api/contracts/tickets/${encodeURIComponent(ticketId)}/copy`;
  return query ? `${base}?${query}` : base;
}

export async function downloadSignedContractCopy(ticketId, format = "pdf", signToken) {
  const res = await fetch(getSignedCopyDownloadUrl(ticketId, format, signToken), {
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    const err = contentType.includes("application/json")
      ? await res.json().catch(() => ({}))
      : {};
    throw new Error(err.error || `Download failed (${res.status})`);
  }

  if (format === "pdf" && !contentType.includes("pdf")) {
    throw new Error("PDF copy is not available yet");
  }

  const blob = await res.blob();
  const ext = format === "html" ? "html" : format === "json" ? "json" : "pdf";
  const filename = `contract-${ticketId}.${ext}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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
