import React from "react";
import { THEMES, getThemeLabel } from "../lib/themes";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";

export default function ThemeSwitcher({ className = "" }) {
  const { activeTheme, setTheme } = useAppSettingsContext();
  const { locale, t } = useI18n();

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      role="group"
      aria-label={t("common.theme")}
    >
      <span className="hidden sm:inline font-lcd text-[9px] tracking-wider text-xdj-muted uppercase me-1">
        {t("common.theme")}
      </span>
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
  );
}
