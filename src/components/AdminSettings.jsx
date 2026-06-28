import React, { useState } from "react";
import { THEMES, getThemeLabel } from "../lib/themes";
import { LOCALE_LABELS, LOCALES } from "../lib/i18n/translations";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";

export default function AdminSettings() {
  const { settings, updateSettings } = useAppSettingsContext();
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState(() => ({
    defaultLocale: settings.defaultLocale,
    theme: settings.theme,
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const themeName = (theme) => getThemeLabel(theme, locale);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateSettings(draft);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel-luxury rounded-sm p-5 sm:p-8 max-w-2xl">
      <p className="font-lcd text-[10px] tracking-[0.25em] text-xdj-cyan uppercase mb-1">SETTINGS</p>
      <h2 className="text-lg font-semibold text-xdj-gold mb-1">{t("admin.settingsTitle")}</h2>
      <p className="text-xs text-xdj-muted mb-6">{t("admin.settingsSubtitle")}</p>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-xdj-text mb-2">{t("admin.defaultLocale")}</label>
          <div className="flex flex-wrap gap-2">
            {LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, defaultLocale: code }))}
                className={`chip-xdj ${draft.defaultLocale === code ? "is-active" : ""}`}
              >
                {LOCALE_LABELS[code]}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-xdj-muted mt-2">
            Visitors can still switch language in the header; this sets the first visit default.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-xdj-text mb-2">{t("admin.siteTheme")}</label>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, theme: theme.id }))}
                className={`theme-card rounded-sm border p-3 text-start transition-colors ${
                  draft.theme === theme.id
                    ? "border-xdj-cyan bg-xdj-cyan/10"
                    : "border-xdj-border hover:border-xdj-muted"
                }`}
              >
                <div className="flex gap-1 mb-2">
                  {theme.preview.map((color) => (
                    <span
                      key={color}
                      className="w-5 h-5 rounded-sm border border-white/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-xdj-text">{themeName(theme)}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-xdj-muted mt-2">{t("admin.themeHint")}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-luxury-primary px-5 py-2 rounded-sm text-sm min-h-[44px] disabled:opacity-40"
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
        {saved && <span className="text-xs text-xdj-cyan">{t("admin.saved")}</span>}
      </div>
    </section>
  );
}
