import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  localeDir,
  readStoredLocale,
  translate,
  writeStoredLocale,
} from "./translations.js";
import { applyTheme, readStoredTheme, setPersonalTheme, DEFAULT_THEME_ID } from "../themes.js";
import { DEFAULT_APP_SETTINGS } from "../defaultAppSettings.js";
import { normalizeDropTypes } from "../dropTypes.js";
import { normalizeDropTypeColors } from "../dropTypeColors.js";
import { fetchAppSettings, saveAppSettings } from "../api/dataApi.js";

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);
  const [ready, setReady] = useState(false);
  const [locale, setLocaleState] = useState(() => readStoredLocale() ?? DEFAULT_APP_SETTINGS.defaultLocale);
  const [personalTheme, setPersonalThemeState] = useState(() => readStoredTheme());

  const activeTheme = personalTheme ?? settings.theme ?? DEFAULT_THEME_ID;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchAppSettings();
        if (cancelled) return;
        const dropTypes = normalizeDropTypes(remote?.dropTypes ?? DEFAULT_APP_SETTINGS.dropTypes);
        const merged = {
          ...DEFAULT_APP_SETTINGS,
          ...(remote || {}),
          dropTypes,
          dropTypeColors: normalizeDropTypeColors(
            dropTypes,
            remote?.dropTypeColors ?? DEFAULT_APP_SETTINGS.dropTypeColors
          ),
        };
        setSettings(merged);
        setLocaleState((prev) => readStoredLocale() ?? merged.defaultLocale ?? "he");
      } catch {
        /* use defaults */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDir(locale);
  }, [locale]);

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  const setLocale = useCallback((next) => {
    setLocaleState(next);
    writeStoredLocale(next);
  }, []);

  const setTheme = useCallback((themeId) => {
    const id = setPersonalTheme(themeId);
    setPersonalThemeState(id);
  }, []);

  const updateSettings = useCallback(async (patch) => {
    const dropTypes = patch.dropTypes
      ? normalizeDropTypes(patch.dropTypes)
      : normalizeDropTypes(settings.dropTypes);
    const next = {
      ...settings,
      ...patch,
      dropTypes,
      dropTypeColors: normalizeDropTypeColors(
        dropTypes,
        patch.dropTypeColors ?? settings.dropTypeColors
      ),
    };
    setSettings(next);
    if (patch.theme && !personalTheme) {
      applyTheme(patch.theme);
    }
    await saveAppSettings(next);
    return next;
  }, [settings, personalTheme]);

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);
  const dir = localeDir(locale);
  const isRtl = dir === "rtl";

  const value = useMemo(
    () => ({
      ready,
      settings,
      locale,
      setLocale,
      updateSettings,
      activeTheme,
      setTheme,
      t,
      dir,
      isRtl,
    }),
    [ready, settings, locale, setLocale, updateSettings, activeTheme, setTheme, t, dir, isRtl]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettingsContext() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error("useAppSettingsContext must be used within AppSettingsProvider");
  return ctx;
}

export function useI18n() {
  const { locale, setLocale, t, dir, isRtl } = useAppSettingsContext();
  return { locale, setLocale, t, dir, isRtl };
}
