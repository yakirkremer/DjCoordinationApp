import React, { useEffect, useRef, useState } from "react";
import { THEMES, getThemeLabel } from "../lib/themes";
import { PLAYER_STYLES, BROWSER_STYLES } from "../lib/designStyles";
import { WAVEFORM_STYLES } from "../lib/waveformStyles";
import DesignStylePicker from "./DesignStylePicker";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";

export default function AppearanceSwitcher({ className = "" }) {
  const {
    activeTheme,
    setTheme,
    activePlayerStyle,
    setPlayerStyle,
    activeBrowserStyle,
    setBrowserStyle,
    activeWaveformStyle,
    setWaveformStyle,
  } = useAppSettingsContext();
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`appearance-switcher relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="appearance-switcher-toggle chip-xdj"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {t("common.appearance")}
      </button>

      {open ? (
        <div className="appearance-panel" role="dialog" aria-label={t("common.appearance")}>
          <section className="appearance-section">
            <h3 className="appearance-section-title">{t("appearance.colorTheme")}</h3>
            <div className="appearance-theme-row">
              {THEMES.map((theme) => {
                const isActive = activeTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    title={getThemeLabel(theme, locale)}
                    onClick={() => setTheme(theme.id)}
                    className={`theme-swatch rounded-sm border-2 transition-transform active:scale-95 ${
                      isActive ? "border-xdj-cyan scale-110" : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                    aria-pressed={isActive}
                    aria-label={getThemeLabel(theme, locale)}
                  >
                    <span className="theme-swatch-inner flex overflow-hidden rounded-[2px]">
                      {theme.preview.map((color) => (
                        <span key={color} className="w-2 h-5" style={{ backgroundColor: color }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="appearance-section">
            <h3 className="appearance-section-title">{t("appearance.playerStyle")}</h3>
            <DesignStylePicker
              styles={PLAYER_STYLES}
              value={activePlayerStyle}
              onChange={setPlayerStyle}
              locale={locale}
            />
          </section>

          <section className="appearance-section">
            <h3 className="appearance-section-title">{t("appearance.browserStyle")}</h3>
            <DesignStylePicker
              styles={BROWSER_STYLES}
              value={activeBrowserStyle}
              onChange={setBrowserStyle}
              locale={locale}
            />
          </section>

          <section className="appearance-section">
            <h3 className="appearance-section-title">{t("appearance.waveformStyle")}</h3>
            <DesignStylePicker
              styles={WAVEFORM_STYLES}
              value={activeWaveformStyle}
              onChange={setWaveformStyle}
              locale={locale}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
