/** Who may edit this field when the contract is sent to a client. */
export const FIELD_EDITORS = {
  client: "client",
  admin: "admin",
};

export function isClientEditable(field) {
  if (!field) return false;
  if (field.type === "signature") return true;
  return field.editableBy !== FIELD_EDITORS.admin;
}

export function isAdminEditable(field) {
  return field?.editableBy === FIELD_EDITORS.admin;
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

export function buildInitialContractValues(fields = []) {
  const values = {};
  for (const field of fields) {
    values[field.id] = normalizeFieldDefault(field);
  }
  return values;
}

/** Merge client-submitted values with admin defaults (client cannot override admin fields). */
export function mergeSignedContractValues(fields = [], clientValues = {}) {
  const merged = buildInitialContractValues(fields);
  for (const field of fields) {
    if (!isClientEditable(field)) continue;
    if (clientValues[field.id] !== undefined) {
      merged[field.id] =
        field.type === "checkbox" ? Boolean(clientValues[field.id]) : String(clientValues[field.id] ?? "");
    }
  }
  return merged;
}

export function isFieldValueEmpty(field, value) {
  if (field.type === "checkbox") return !value;
  return !value || !String(value).trim();
}

export function validateClientContractValues(fields = [], clientValues = {}) {
  const merged = mergeSignedContractValues(fields, clientValues);
  for (const field of fields) {
    if (!isClientEditable(field)) continue;
    if (field.required === false) continue;
    if (isFieldValueEmpty(field, merged[field.id])) {
      return `שדה "${field.label || field.id}" חובה`;
    }
  }
  return null;
}
