import React, { useState } from "react";
import { THEMES, getThemeLabel } from "../lib/themes";
import { LOCALE_LABELS, LOCALES } from "../lib/i18n/translations";
import { normalizeDropTypes } from "../lib/dropTypes";
import {
  getDefaultHexForDrop,
  getDropTypeStyle,
  normalizeDropTypeColors,
} from "../lib/dropTypeColors";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";

export default function AdminSettings() {
  const { settings, updateSettings } = useAppSettingsContext();
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState(() => ({
    defaultLocale: settings.defaultLocale,
    theme: settings.theme,
    dropTypes: normalizeDropTypes(settings.dropTypes),
    dropTypeColors: normalizeDropTypeColors(settings.dropTypes, settings.dropTypeColors),
  }));
  const [newDropType, setNewDropType] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const themeName = (theme) => getThemeLabel(theme, locale);

  const handleAddDropType = () => {
    const label = newDropType.trim();
    if (!label) return;
    setDraft((d) => {
      const dropTypes = normalizeDropTypes([...d.dropTypes, label]);
      return {
        ...d,
        dropTypes,
        dropTypeColors: normalizeDropTypeColors(dropTypes, {
          ...d.dropTypeColors,
          [label]: getDefaultHexForDrop(label, dropTypes.length - 1),
        }),
      };
    });
    setNewDropType("");
  };

  const handleRemoveDropType = (drop) => {
    setDraft((d) => {
      const dropTypes = normalizeDropTypes(d.dropTypes.filter((item) => item !== drop));
      const dropTypeColors = { ...d.dropTypeColors };
      delete dropTypeColors[drop];
      return {
        ...d,
        dropTypes,
        dropTypeColors: normalizeDropTypeColors(dropTypes, dropTypeColors),
      };
    });
  };

  const handleDropColorChange = (drop, hex) => {
    setDraft((d) => ({
      ...d,
      dropTypeColors: {
        ...d.dropTypeColors,
        [drop]: hex,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const dropTypes = normalizeDropTypes(draft.dropTypes);
      await updateSettings({
        ...draft,
        dropTypes,
        dropTypeColors: normalizeDropTypeColors(dropTypes, draft.dropTypeColors),
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
          <div className="admin-drop-type-list flex flex-col gap-2 mb-3">
            {draft.dropTypes.map((drop) => {
              const color = draft.dropTypeColors[drop];
              return (
                <div key={drop} className="admin-drop-type-row">
                  <span
                    className="admin-drop-type-chip inline-flex items-center px-2.5 py-1 rounded-sm border text-xs font-semibold uppercase tracking-wide min-w-[5.5rem]"
                    style={getDropTypeStyle(drop, draft.dropTypeColors)}
                  >
                    {drop}
                  </span>
                  <label className="admin-drop-type-color-field">
                    <span className="sr-only">{t("admin.dropTypeColor", { drop })}</span>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => handleDropColorChange(drop, e.target.value)}
                      className="admin-drop-type-color-input"
                      aria-label={t("admin.dropTypeColor", { drop })}
                    />
                  </label>
                  <span className="admin-drop-type-hex font-mono text-[10px] text-xdj-muted">{color}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDropType(drop)}
                    disabled={draft.dropTypes.length <= 1}
                    className="admin-drop-type-remove text-xdj-muted hover:text-red-300 disabled:opacity-30"
                    aria-label={t("admin.removeDropType", { drop })}
                  >
                    ×
                  </button>
                </div>
              );
            })}
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
