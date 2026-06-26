export const CLIENT_TYPES = [
  { id: "full-wedding", label: "חתונה מלאה" },
  { id: "after", label: "אפטר" },
];

export const DEFAULT_CLIENT_TYPE = "full-wedding";

export function normalizeClientType(type) {
  if (type && CLIENT_TYPES.some((t) => t.id === type)) return type;
  return DEFAULT_CLIENT_TYPE;
}

export function getClientTypeLabel(type) {
  return CLIENT_TYPES.find((t) => t.id === type)?.label ?? type;
}
