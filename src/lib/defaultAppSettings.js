import { DEFAULT_DROP_TYPES } from "./dropTypes.js";
import { normalizeDropTypeColors } from "./dropTypeColors.js";
import { DEFAULT_GENRES } from "./categories.js";
import { DEFAULT_BROWSER_ROW_SIZE_ID } from "./browserRowSize.js";

/** Site-wide defaults (admin-editable via Settings tab). */
export const DEFAULT_APP_SETTINGS = {
  defaultLocale: "he",
  theme: "xdj-dark",
  playerStyle: "xdj-deck",
  browserStyle: "xdj-hardware",
  browserRowSize: DEFAULT_BROWSER_ROW_SIZE_ID,
  waveformStyle: "classic",
  genres: DEFAULT_GENRES,
  dropTypes: DEFAULT_DROP_TYPES,
  dropTypeColors: normalizeDropTypeColors(DEFAULT_DROP_TYPES),
  genreTrackOrders: {},
};
