/** Who may edit this field when the contract is sent to a client. */
import {
  formatContractDateDisplay,
  normalizeContractDateValue,
} from "./contractDateFormat.js";

export const FIELD_EDITORS = {
  client: "client",
  admin: "admin",
  both: "both",
};

export function normalizeFieldEditor(field) {
  return field?.editableBy ?? FIELD_EDITORS.client;
}

export function isClientEditable(field) {
  if (!field) return false;
  if (field.type === "signature") return true;
  const editor = normalizeFieldEditor(field);
  return editor === FIELD_EDITORS.client || editor === FIELD_EDITORS.both;
}

export function isAdminEditable(field) {
  if (!field) return false;
  const editor = normalizeFieldEditor(field);
  return editor === FIELD_EDITORS.admin || editor === FIELD_EDITORS.both;
}

export function normalizeFieldDefault(field) {
  if (!field) return "";
  if (field.type === "checkbox") {
    if (field.defaultValue === true || field.defaultValue === "true") return true;
    return false;
  }
  if (field.defaultValue === undefined || field.defaultValue === null) return "";
  return String(field.defaultValue);
}

export const CLIENT_PROFILE_PREFILL_KEYS = {
  clientName: "clientName",
  eventDate: "eventDate",
  eventLocation: "eventLocation",
};

/** Client attributes a contract field may sync from (set per field in template editor). */
export const FIELD_SYNC_FROM_KEYS = [
  "clientName",
  "loginCode",
  "clientType",
  "eventDate",
  "eventLocation",
  "djNotes",
];

const PREFILL_LABEL_HINTS = {
  [CLIENT_PROFILE_PREFILL_KEYS.clientName]: ["שם", "name"],
  [CLIENT_PROFILE_PREFILL_KEYS.eventDate]: ["תאריך", "date"],
  [CLIENT_PROFILE_PREFILL_KEYS.eventLocation]: ["מיקום", "מקום", "location", "venue"],
};

export function getFieldSyncFromExplicit(field) {
  const value = field?.syncFrom || field?.prefillFrom;
  return value && FIELD_SYNC_FROM_KEYS.includes(value) ? value : null;
}

export function inferFieldPrefillKey(field) {
  if (!field) return null;
  const explicit = getFieldSyncFromExplicit(field);
  if (explicit) return explicit;

  const label = (field.label || "").toLowerCase();
  if (
    field.type === "date" ||
    PREFILL_LABEL_HINTS[CLIENT_PROFILE_PREFILL_KEYS.eventDate].some((hint) => label.includes(hint))
  ) {
    return CLIENT_PROFILE_PREFILL_KEYS.eventDate;
  }
  if (PREFILL_LABEL_HINTS[CLIENT_PROFILE_PREFILL_KEYS.eventLocation].some((hint) => label.includes(hint))) {
    return CLIENT_PROFILE_PREFILL_KEYS.eventLocation;
  }
  if (
    field.type === "text" &&
    PREFILL_LABEL_HINTS[CLIENT_PROFILE_PREFILL_KEYS.clientName].some((hint) => label.includes(hint))
  ) {
    return CLIENT_PROFILE_PREFILL_KEYS.clientName;
  }
  return null;
}

export function normalizeClientProfile(profile = {}) {
  return {
    clientName: String(profile.clientName ?? "").trim(),
    eventDate: String(profile.eventDate ?? "").trim(),
    eventLocation: String(profile.eventLocation ?? "").trim(),
  };
}

export function getMissingClientProfileFields(profile = {}) {
  const normalized = normalizeClientProfile(profile);
  const missing = [];
  if (!normalized.clientName) missing.push(CLIENT_PROFILE_PREFILL_KEYS.clientName);
  if (!normalized.eventDate) missing.push(CLIENT_PROFILE_PREFILL_KEYS.eventDate);
  if (!normalized.eventLocation) missing.push(CLIENT_PROFILE_PREFILL_KEYS.eventLocation);
  return missing;
}

export function buildClientProfilePrefillPatch(fields = [], profile = {}, ticketValues = {}) {
  const sources = normalizeClientProfile(profile);
  const display = buildTicketDisplayValues(fields, ticketValues);
  const patch = {};

  for (const field of fields) {
    if (field.type === "signature" || !isClientEditable(field)) continue;
    const prefillKey = inferFieldPrefillKey(field);
    if (!prefillKey) continue;
    const sourceValue = sources[prefillKey];
    if (!sourceValue) continue;
    if (!isFieldValueEmpty(field, display[field.id])) continue;
    patch[field.id] = sourceValue;
  }

  return patch;
}

function formatSyncValueForField(field, rawValue) {
  if (rawValue == null || rawValue === "") return "";
  if (field?.type === "checkbox") {
    return rawValue === true || rawValue === "true" || rawValue === "1";
  }
  if (field?.type === "date") {
    return normalizeContractDateValue(rawValue);
  }
  return String(rawValue);
}

export function formatContractFieldDisplayValue(field, value) {
  if (field?.type === "date") return formatContractDateDisplay(value);
  if (field?.type === "checkbox") {
    return value ? "☑" : "☐";
  }
  return value == null || value === "" ? "" : String(value);
}

function normalizeDateFieldsInValues(fields = [], values = {}) {
  const next = { ...values };
  for (const field of fields) {
    if (field.type !== "date") continue;
    if (next[field.id] == null || next[field.id] === "") continue;
    next[field.id] = normalizeContractDateValue(next[field.id]);
  }
  return next;
}

function buildLegacyFieldIdToSyncKey(detailSync = {}) {
  const map = {};
  if (!detailSync || typeof detailSync !== "object") return map;
  for (const [key, fieldId] of Object.entries(detailSync)) {
    if (fieldId && typeof fieldId === "string") map[fieldId] = key;
  }
  return map;
}

function resolveFieldSyncKey(field, legacyFieldIdToKey = {}) {
  const explicit = getFieldSyncFromExplicit(field);
  if (explicit) return explicit;
  if (legacyFieldIdToKey[field.id]) return legacyFieldIdToKey[field.id];
  return null;
}

/** Apply per-field syncFrom mappings (and legacy template.detailSync) to ticket values. */
export function applyFieldSyncToValues(
  fields = [],
  clientDetails = {},
  currentValues = {},
  { onlyEmpty = false, detailSync = {}, sourceValues = null } = {}
) {
  const legacyFieldIdToKey = buildLegacyFieldIdToSyncKey(detailSync);
  const next = { ...currentValues };
  const storedValues = sourceValues ?? {};

  for (const field of fields) {
    if (field.type === "signature") continue;
    const syncKey = resolveFieldSyncKey(field, legacyFieldIdToKey);
    if (!syncKey) continue;

    const raw = clientDetails[syncKey];
    if (raw == null || String(raw).trim() === "") continue;

    if (onlyEmpty) {
      const stored = storedValues[field.id];
      if (stored != null && stored !== "" && !isFieldValueEmpty(field, stored)) {
        continue;
      }
    }

    next[field.id] = formatSyncValueForField(field, raw);
  }

  return next;
}

export function buildTicketValuesWithClientDetails(
  fields = [],
  ticketValues = {},
  clientDetails = {},
  detailSync = {},
  { onlyEmpty = true } = {}
) {
  const base = buildTicketDisplayValues(fields, ticketValues);
  return applyFieldSyncToValues(fields, clientDetails, base, {
    onlyEmpty,
    detailSync,
    sourceValues: ticketValues,
  });
}

export function buildInitialContractValues(fields = []) {
  const values = {};
  for (const field of fields) {
    const def = normalizeFieldDefault(field);
    values[field.id] = field.type === "date" ? normalizeContractDateValue(def) : def;
  }
  return values;
}

export function buildTicketDisplayValues(fields = [], ticketValues = {}) {
  const merged = { ...buildInitialContractValues(fields), ...ticketValues };
  return normalizeDateFieldsInValues(fields, merged);
}

export function buildTicketDisplayValuesWithProfile(
  fields = [],
  ticketValues = {},
  _profile = {},
  _detailSync = {}
) {
  return buildTicketDisplayValues(fields, ticketValues);
}

/** Merge client sign submission with template defaults and pre-filled ticket values (admin fields). */
export function mergeSignedContractValues(fields = [], clientValues = {}, ticketValues = {}) {
  const merged = buildTicketDisplayValues(fields, ticketValues);
  for (const field of fields) {
    if (!isClientEditable(field)) continue;
    if (clientValues[field.id] !== undefined) {
      if (field.type === "checkbox") {
        merged[field.id] = Boolean(clientValues[field.id]);
      } else if (field.type === "date") {
        merged[field.id] = normalizeContractDateValue(clientValues[field.id]);
      } else {
        merged[field.id] = String(clientValues[field.id] ?? "");
      }
    }
  }
  return normalizeDateFieldsInValues(fields, merged);
}

/** Apply admin-only patches to a ticket's stored values. */
export function patchAdminTicketValues(fields = [], currentValues = {}, adminPatch = {}) {
  const next = { ...currentValues };
  for (const field of fields) {
    if (!isAdminEditable(field)) continue;
    if (adminPatch[field.id] === undefined) continue;
    next[field.id] =
      field.type === "checkbox"
        ? Boolean(adminPatch[field.id])
        : field.type === "date"
          ? normalizeContractDateValue(adminPatch[field.id])
          : String(adminPatch[field.id] ?? "");
  }
  return next;
}

export function extractAdminFieldPatch(fields = [], values = {}) {
  const patch = {};
  for (const field of fields) {
    if (!isAdminEditable(field)) continue;
    if (values[field.id] === undefined) continue;
    patch[field.id] = values[field.id];
  }
  return patch;
}

export function isFieldValueEmpty(field, value) {
  if (field.type === "checkbox") return !value;
  return !value || !String(value).trim();
}

export function validateClientContractValues(fields = [], clientValues = {}, ticketValues = {}) {
  const merged = mergeSignedContractValues(fields, clientValues, ticketValues);
  for (const field of fields) {
    if (!isClientEditable(field)) continue;
    if (field.required === false) continue;
    if (isFieldValueEmpty(field, merged[field.id])) {
      return `שדה "${field.label || field.id}" חובה`;
    }
  }
  return null;
}
