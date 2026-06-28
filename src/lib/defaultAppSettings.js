import { DEFAULT_DROP_TYPES } from "./dropTypes.js";
import { normalizeDropTypeColors } from "./dropTypeColors.js";
import { DEFAULT_GENRES } from "./categories.js";

/** Site-wide defaults (admin-editable via Settings tab). */
export const DEFAULT_APP_SETTINGS = {
  defaultLocale: "he",
  theme: "xdj-dark",
  genres: DEFAULT_GENRES,
  dropTypes: DEFAULT_DROP_TYPES,
  dropTypeColors: normalizeDropTypeColors(DEFAULT_DROP_TYPES),
};
