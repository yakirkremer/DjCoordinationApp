import { useCallback, useMemo } from "react";
import {
  getDropTypeColors,
  getDropTypeCssVars,
  getDropTypeStyle,
  normalizeDropTypeColors,
} from "../lib/dropTypeColors";
import { useAppSettingsContext } from "../lib/i18n/AppSettingsContext";

export function useDropColors() {
  const { settings } = useAppSettingsContext();
  const colorMap = useMemo(
    () => normalizeDropTypeColors(settings.dropTypes, settings.dropTypeColors),
    [settings.dropTypes, settings.dropTypeColors]
  );

  const getColors = useCallback((drop) => getDropTypeColors(drop, colorMap), [colorMap]);
  const getStyle = useCallback((drop) => getDropTypeStyle(drop, colorMap), [colorMap]);
  const getCssVars = useCallback((drop) => getDropTypeCssVars(drop, colorMap), [colorMap]);

  return { colorMap, getColors, getStyle, getCssVars };
}
