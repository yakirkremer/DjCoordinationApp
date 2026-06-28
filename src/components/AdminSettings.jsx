import React, { useState } from "react";
import { THEMES, getThemeLabel } from "../lib/themes";
import { LOCALE_LABELS, LOCALES } from "../lib/i18n/translations";
import { normalizeDropTypes } from "../lib/dropTypes";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";

export default function AdminSettings() {
  const { settings, updateSettings } = useAppSettingsContext();
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState(() => ({
    defaultLocale: settings.defaultLocale,
    theme: settings.theme,
    dropTypes: normalizeDropTypes(settings.dropTypes),
  }));
  const [newDropType, setNewDropType] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const themeName = (theme) => getThemeLabel(theme, locale);

  const handleAddDropType = () => {
    const label = newDropType.trim();
    if (!label) return;
    setDraft((d) => ({
      ...d,
      dropTypes: normalizeDropTypes([...d.dropTypes, label]),
    }));
    setNewDropType("");
  };

  const handleRemoveDropType = (drop) => {
    setDraft((d) => {
      const next = d.dropTypes.filter((item) => item !== drop);
      return { ...d, dropTypes: normalizeDropTypes(next) };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateSettings({
        ...draft,
        dropTypes: normalizeDropTypes(draft.dropTypes),
      });
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

        <div>
          <label className="block text-xs font-semibold text-xdj-text mb-2">{t("admin.dropTypesTitle")}</label>
          <p className="text-[10px] text-xdj-muted mb-3">{t("admin.dropTypesHint")}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {draft.dropTypes.map((drop) => (
              <span
                key={drop}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-xdj-border bg-black/20 text-xs text-xdj-text"
              >
                {drop}
                <button
                  type="button"
                  onClick={() => handleRemoveDropType(drop)}
                  disabled={draft.dropTypes.length <= 1}
                  className="text-xdj-muted hover:text-red-300 disabled:opacity-30"
                  aria-label={t("admin.removeDropType", { drop })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newDropType}
              onChange={(e) => setNewDropType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddDropType();
                }
              }}
              placeholder={t("admin.dropTypePlaceholder")}
              className="input-luxury px-3 py-2 text-xs rounded-sm flex-1 min-w-[10rem]"
            />
            <button
              type="button"
              onClick={handleAddDropType}
              className="btn-luxury-secondary px-4 py-2 rounded-sm text-xs min-h-[36px]"
            >
              {t("admin.addDropType")}
            </button>
          </div>
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
