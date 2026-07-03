/** Who may edit this field when the contract is sent to a client. */
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
  "energyLevel",
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
  return String(rawValue);
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
  return inferFieldPrefillKey(field);
}

/** Apply per-field syncFrom mappings (and legacy template.detailSync) to ticket values. */
export function applyFieldSyncToValues(
  fields = [],
  clientDetails = {},
  currentValues = {},
  { onlyEmpty = false, detailSync = {} } = {}
) {
  const legacyFieldIdToKey = buildLegacyFieldIdToSyncKey(detailSync);
  const next = { ...currentValues };

  for (const field of fields) {
    if (field.type === "signature") continue;
    const syncKey = resolveFieldSyncKey(field, legacyFieldIdToKey);
    if (!syncKey) continue;

    const raw = clientDetails[syncKey];
    if (raw == null || String(raw).trim() === "") continue;

    if (onlyEmpty && !isFieldValueEmpty(field, next[field.id] ?? normalizeFieldDefault(field))) {
      continue;
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
  return applyFieldSyncToValues(fields, clientDetails, base, { onlyEmpty, detailSync });
}

export function buildInitialContractValues(fields = []) {
  const values = {};
  for (const field of fields) {
    values[field.id] = normalizeFieldDefault(field);
  }
  return values;
}

export function buildTicketDisplayValues(fields = [], ticketValues = {}) {
  return { ...buildInitialContractValues(fields), ...ticketValues };
}

export function buildTicketDisplayValuesWithProfile(
  fields = [],
  ticketValues = {},
  profile = {},
  detailSync = {}
) {
  const clientDetails = {
    clientName: profile.clientName ?? "",
    eventDate: profile.eventDate ?? "",
    eventLocation: profile.eventLocation ?? "",
  };
  return buildTicketValuesWithClientDetails(fields, ticketValues, clientDetails, detailSync, {
    onlyEmpty: true,
  });
}

/** Merge client sign submission with template defaults and pre-filled ticket values (admin fields). */
export function mergeSignedContractValues(fields = [], clientValues = {}, ticketValues = {}) {
  const merged = buildTicketDisplayValues(fields, ticketValues);
  for (const field of fields) {
    if (!isClientEditable(field)) continue;
    if (clientValues[field.id] !== undefined) {
      merged[field.id] =
        field.type === "checkbox" ? Boolean(clientValues[field.id]) : String(clientValues[field.id] ?? "");
    }
  }
  return merged;
}

/** Apply admin-only patches to a ticket's stored values. */
export function patchAdminTicketValues(fields = [], currentValues = {}, adminPatch = {}) {
  const next = { ...currentValues };
  for (const field of fields) {
    if (!isAdminEditable(field)) continue;
    if (adminPatch[field.id] === undefined) continue;
    next[field.id] =
      field.type === "checkbox" ? Boolean(adminPatch[field.id]) : String(adminPatch[field.id] ?? "");
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
