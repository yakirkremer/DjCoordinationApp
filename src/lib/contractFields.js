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

const PREFILL_LABEL_HINTS = {
  [CLIENT_PROFILE_PREFILL_KEYS.clientName]: ["שם", "name"],
  [CLIENT_PROFILE_PREFILL_KEYS.eventDate]: ["תאריך", "date"],
  [CLIENT_PROFILE_PREFILL_KEYS.eventLocation]: ["מיקום", "מקום", "location", "venue"],
};

export function inferFieldPrefillKey(field) {
  if (!field) return null;
  const fromField = field.prefillFrom;
  if (fromField && PREFILL_LABEL_HINTS[fromField]) return fromField;

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

export function buildTicketDisplayValuesWithProfile(fields = [], ticketValues = {}, profile = {}) {
  const base = buildTicketDisplayValues(fields, ticketValues);
  const patch = buildClientProfilePrefillPatch(fields, profile, ticketValues);
  return { ...base, ...patch };
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
