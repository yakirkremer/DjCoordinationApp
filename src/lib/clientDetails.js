import { mergePreferences, ENERGY_LEVELS } from "./preferences.js";
import { getClientTypeLabel } from "./clientTypes.js";
import {
  applyFieldSyncToValues,
  getFieldSyncFromExplicit,
  inferFieldPrefillKey,
} from "./contractFields.js";

/** Client attribute keys used for per-field contract sync (field.syncFrom). */
export const CLIENT_DETAIL_KEYS = {
  clientName: "clientName",
  loginCode: "loginCode",
  clientType: "clientType",
  eventDate: "eventDate",
  eventLocation: "eventLocation",
  energyLevel: "energyLevel",
  djNotes: "djNotes",
};

export const CLIENT_DETAIL_SOURCES = [
  { key: CLIENT_DETAIL_KEYS.clientName, label: "שם הלקוח" },
  { key: CLIENT_DETAIL_KEYS.loginCode, label: "קוד כניסה" },
  { key: CLIENT_DETAIL_KEYS.clientType, label: "סוג אירוע" },
  { key: CLIENT_DETAIL_KEYS.eventDate, label: "תאריך אירוע" },
  { key: CLIENT_DETAIL_KEYS.eventLocation, label: "מיקום אירוע" },
  { key: CLIENT_DETAIL_KEYS.energyLevel, label: "רמת אנרגיה" },
  { key: CLIENT_DETAIL_KEYS.djNotes, label: "הערות לדיג'יי" },
];

export function buildClientDetailsSnapshot(client, preferencesInput) {
  const preferences = mergePreferences(preferencesInput);
  const energyLabel =
    ENERGY_LEVELS.find((level) => level.id === preferences.energyLevel)?.label ??
    preferences.energyLevel ??
    "";

  return {
    [CLIENT_DETAIL_KEYS.clientName]: String(client?.name ?? "").trim(),
    [CLIENT_DETAIL_KEYS.loginCode]: String(client?.loginCode ?? "").trim(),
    [CLIENT_DETAIL_KEYS.clientType]: getClientTypeLabel(client?.clientType) || "",
    [CLIENT_DETAIL_KEYS.eventDate]: String(
      preferences.eventDate || client?.eventDate || ""
    ).trim(),
    [CLIENT_DETAIL_KEYS.eventLocation]: String(
      preferences.eventLocation || client?.eventLocation || ""
    ).trim(),
    [CLIENT_DETAIL_KEYS.energyLevel]: energyLabel,
    [CLIENT_DETAIL_KEYS.djNotes]: String(preferences.djNotes ?? "").trim(),
  };
}

export function normalizeDetailSync(detailSync) {
  if (!detailSync || typeof detailSync !== "object") return {};
  const out = {};
  for (const source of CLIENT_DETAIL_SOURCES) {
    const fieldId = detailSync[source.key];
    if (fieldId && typeof fieldId === "string") {
      out[source.key] = fieldId;
    }
  }
  return out;
}

/** Guess initial mappings from field labels (שם, תאריך, מיקום…). */
export function buildDefaultDetailSync(fields = []) {
  const sync = {};
  for (const field of fields) {
    const key = getFieldSyncFromExplicit(field) || inferFieldPrefillKey(field);
    if (key && !sync[key]) {
      sync[key] = field.id;
    }
  }
  return sync;
}

/** Copy legacy template.detailSync onto fields that lack syncFrom. */
export function hydrateFieldSyncFromDetailSync(fields = [], detailSync = {}) {
  const sync = normalizeDetailSync(detailSync);
  if (Object.keys(sync).length === 0) return fields;

  return fields.map((field) => {
    if (getFieldSyncFromExplicit(field)) return field;
    const key = Object.entries(sync).find(([, fieldId]) => fieldId === field.id)?.[0];
    return key ? { ...field, syncFrom: key } : field;
  });
}

export function resolveDetailSync(template, override) {
  const fromTemplate = normalizeDetailSync(template?.detailSync);
  if (Object.keys(fromTemplate).length > 0) return fromTemplate;
  return normalizeDetailSync(override);
}

/** @deprecated Use applyFieldSyncToValues — kept for callers passing detailSync only. */
export function applyDetailSyncToValues(
  fields = [],
  detailSync = {},
  clientDetails = {},
  currentValues = {},
  options = {}
) {
  return applyFieldSyncToValues(fields, clientDetails, currentValues, {
    ...options,
    detailSync,
  });
}

export function getSyncableContractFields(fields = []) {
  return (fields ?? []).filter((field) => field.type !== "signature");
}
