/** Parse contract date strings (ISO, DD/MM/YYYY, DD-MM-YYYY). */
export function parseContractDate(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;

  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(s);
  if (m) {
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }

  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (m) {
    return { year: Number(m[3]), month: Number(m[2]), day: Number(m[1]) };
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth() + 1,
      day: parsed.getDate(),
    };
  }

  return null;
}

function formatContractDateDisplayFromParts(parts) {
  const dd = String(parts.day).padStart(2, "0");
  const mm = String(parts.month).padStart(2, "0");
  return `${dd}/${mm}/${parts.year}`;
}

/** Display format for contract fields: DD/MM/YYYY */
export function formatContractDateDisplay(value) {
  const parts = parseContractDate(value);
  if (!parts) return String(value ?? "").trim();
  return formatContractDateDisplayFromParts(parts);
}

/** Normalize stored contract date values to DD/MM/YYYY */
export function normalizeContractDateValue(value) {
  if (value == null || value === "") return "";
  if (typeof value === "object" && value.year && value.month && value.day) {
    return formatContractDateDisplayFromParts(value);
  }
  const s = String(value).trim();
  if (!s || s === "[object Object]") return "";
  const parts = parseContractDate(s);
  if (!parts) return s;
  return formatContractDateDisplayFromParts(parts);
}

/** Value for `<input type="date">` (YYYY-MM-DD) */
export function contractDateToIsoInput(value) {
  const parts = parseContractDate(value);
  if (!parts) return "";
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  return `${parts.year}-${mm}-${dd}`;
}
