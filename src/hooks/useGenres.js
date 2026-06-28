import { useMemo } from "react";
import { normalizeGenres } from "../lib/categories";
import { useAppSettingsContext } from "../lib/i18n/AppSettingsContext";

export function useGenres() {
  const { settings } = useAppSettingsContext();
  return useMemo(() => normalizeGenres(settings.genres), [settings.genres]);
}
