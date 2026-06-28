import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  localeDir,
  readStoredLocale,
  translate,
  writeStoredLocale,
} from "./translations.js";
import { applyTheme, readStoredTheme, setPersonalTheme, DEFAULT_THEME_ID } from "../themes.js";
import {
  applyBrowserStyle,
  applyPlayerStyle,
  DEFAULT_BROWSER_STYLE_ID,
  DEFAULT_PLAYER_STYLE_ID,
  readStoredBrowserStyle,
  readStoredPlayerStyle,
  setPersonalBrowserStyle,
  setPersonalPlayerStyle,
} from "../designStyles.js";
import {
  applyWaveformStyle,
  DEFAULT_WAVEFORM_STYLE_ID,
  readStoredWaveformStyle,
  setPersonalWaveformStyle,
} from "../waveformStyles.js";
import {
  applyAccessibility,
  DEFAULT_A11Y_PREFERENCES,
  readStoredAccessibility,
  resetPersonalAccessibility,
  setPersonalAccessibility,
} from "../accessibility.js";
import {
  applyBrowserRowSize,
  DEFAULT_BROWSER_ROW_SIZE_ID,
  getBrowserRowSizeById,
} from "../browserRowSize.js";
import { DEFAULT_APP_SETTINGS } from "../defaultAppSettings.js";
import { normalizeDropTypes } from "../dropTypes.js";
import { normalizeDropTypeColors } from "../dropTypeColors.js";
import { normalizeGenres } from "../categories.js";
import { fetchAppSettings, saveAppSettings } from "../api/dataApi.js";

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);
  const [ready, setReady] = useState(false);
  const [locale, setLocaleState] = useState(() => readStoredLocale() ?? DEFAULT_APP_SETTINGS.defaultLocale);
  const [personalTheme, setPersonalThemeState] = useState(() => readStoredTheme());
  const [personalPlayerStyle, setPersonalPlayerStyleState] = useState(() => readStoredPlayerStyle());
  const [personalBrowserStyle, setPersonalBrowserStyleState] = useState(() => readStoredBrowserStyle());
  const [personalWaveformStyle, setPersonalWaveformStyleState] = useState(() => readStoredWaveformStyle());
  const [accessibility, setAccessibilityState] = useState(
    () => readStoredAccessibility() ?? DEFAULT_A11Y_PREFERENCES
  );

  const activeTheme = personalTheme ?? settings.theme ?? DEFAULT_THEME_ID;
  const activePlayerStyle = personalPlayerStyle ?? settings.playerStyle ?? DEFAULT_PLAYER_STYLE_ID;
  const activeBrowserStyle = personalBrowserStyle ?? settings.browserStyle ?? DEFAULT_BROWSER_STYLE_ID;
  const activeWaveformStyle = personalWaveformStyle ?? settings.waveformStyle ?? DEFAULT_WAVEFORM_STYLE_ID;
  const activeBrowserRowSize =
    getBrowserRowSizeById(settings.browserRowSize ?? DEFAULT_BROWSER_ROW_SIZE_ID).id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchAppSettings();
        if (cancelled) return;
        const dropTypes = normalizeDropTypes(remote?.dropTypes ?? DEFAULT_APP_SETTINGS.dropTypes);
        const genres = normalizeGenres(remote?.genres ?? DEFAULT_APP_SETTINGS.genres);
        const merged = {
          ...DEFAULT_APP_SETTINGS,
          ...(remote || {}),
          genres,
          dropTypes,
          dropTypeColors: normalizeDropTypeColors(
            dropTypes,
            remote?.dropTypeColors ?? DEFAULT_APP_SETTINGS.dropTypeColors
          ),
          browserRowSize: getBrowserRowSizeById(
            remote?.browserRowSize ?? DEFAULT_APP_SETTINGS.browserRowSize
          ).id,
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

  useEffect(() => {
    applyPlayerStyle(activePlayerStyle);
  }, [activePlayerStyle]);

  useEffect(() => {
    applyBrowserStyle(activeBrowserStyle);
  }, [activeBrowserStyle]);

  useEffect(() => {
    applyWaveformStyle(activeWaveformStyle);
  }, [activeWaveformStyle]);

  useEffect(() => {
    applyBrowserRowSize(activeBrowserRowSize);
  }, [activeBrowserRowSize]);

  useEffect(() => {
    applyAccessibility(accessibility);
  }, [accessibility]);

  const setLocale = useCallback((next) => {
    setLocaleState(next);
    writeStoredLocale(next);
  }, []);

  const setTheme = useCallback((themeId) => {
    const id = setPersonalTheme(themeId);
    setPersonalThemeState(id);
  }, []);

  const setPlayerStyle = useCallback((styleId) => {
    const id = setPersonalPlayerStyle(styleId);
    setPersonalPlayerStyleState(id);
  }, []);

  const setBrowserStyle = useCallback((styleId) => {
    const id = setPersonalBrowserStyle(styleId);
    setPersonalBrowserStyleState(id);
  }, []);

  const setWaveformStyle = useCallback((styleId) => {
    const id = setPersonalWaveformStyle(styleId);
    setPersonalWaveformStyleState(id);
  }, []);

  const setAccessibility = useCallback((patch) => {
    const next = setPersonalAccessibility(patch);
    setAccessibilityState(next);
    return next;
  }, []);

  const resetAccessibility = useCallback(() => {
    const next = resetPersonalAccessibility();
    setAccessibilityState(next);
    return next;
  }, []);

  const updateSettings = useCallback(async (patch) => {
    const dropTypes = patch.dropTypes
      ? normalizeDropTypes(patch.dropTypes)
      : normalizeDropTypes(settings.dropTypes);
    const genres = patch.genres ? normalizeGenres(patch.genres) : normalizeGenres(settings.genres);
    const next = {
      ...settings,
      ...patch,
      genres,
      dropTypes,
      dropTypeColors: normalizeDropTypeColors(
        dropTypes,
        patch.dropTypeColors ?? settings.dropTypeColors
      ),
    };
    delete next.genreRenames;
    delete next.genreRemoved;
    setSettings(next);
    if (patch.theme && !personalTheme) {
      applyTheme(patch.theme);
    }
    if (patch.playerStyle && !personalPlayerStyle) {
      applyPlayerStyle(patch.playerStyle);
    }
    if (patch.browserStyle && !personalBrowserStyle) {
      applyBrowserStyle(patch.browserStyle);
    }
    if (patch.waveformStyle && !personalWaveformStyle) {
      applyWaveformStyle(patch.waveformStyle);
    }
    if (patch.browserRowSize) {
      applyBrowserRowSize(patch.browserRowSize);
    }
    await saveAppSettings({
      ...next,
      ...(patch.genreRenames ? { genreRenames: patch.genreRenames } : {}),
      ...(patch.genreRemoved ? { genreRemoved: patch.genreRemoved } : {}),
    });
    return next;
  }, [settings, personalTheme, personalPlayerStyle, personalBrowserStyle, personalWaveformStyle]);

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
      activePlayerStyle,
      setPlayerStyle,
      activeBrowserStyle,
      setBrowserStyle,
      activeWaveformStyle,
      setWaveformStyle,
      accessibility,
      setAccessibility,
      resetAccessibility,
      t,
      dir,
      isRtl,
    }),
    [ready, settings, locale, setLocale, updateSettings, activeTheme, setTheme, activePlayerStyle, setPlayerStyle, activeBrowserStyle, setBrowserStyle, activeWaveformStyle, setWaveformStyle, accessibility, setAccessibility, resetAccessibility, t, dir, isRtl]
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
