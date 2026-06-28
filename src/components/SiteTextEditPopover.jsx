import React, { useEffect, useMemo, useState } from "react";
import { translate } from "../lib/i18n/translations";
import { normalizeTextOverrides } from "../lib/i18n/textOverrides";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";

export default function SiteTextEditPopover() {
  const {
    locale,
    settings,
    updateSettings,
    siteTextEditKey,
    closeSiteTextEditor,
  } = useAppSettingsContext();
  const { t, dir } = useI18n();
  const key = siteTextEditKey;

  const savedOverrides = useMemo(
    () => normalizeTextOverrides(settings.textOverrides),
    [settings.textOverrides]
  );

  const defaultValue = useMemo(
    () => (key ? translate(locale, key) : ""),
    [key, locale]
  );

  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!key) return;
    setDraft(savedOverrides[locale]?.[key] ?? "");
    setError("");
  }, [key, locale, savedOverrides]);

  useEffect(() => {
    if (!key) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeSiteTextEditor();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, closeSiteTextEditor]);

  if (!key) return null;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const next = normalizeTextOverrides(savedOverrides);
      const trimmed = draft.trim();
      if (trimmed) next[locale][key] = draft;
      else delete next[locale][key];
      await updateSettings({ textOverrides: next });
      closeSiteTextEditor();
    } catch (err) {
      setError(err.message || t("admin.textEditorFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setDraft("");

  return (
    <div className="site-text-edit-backdrop" dir={dir} onClick={closeSiteTextEditor}>
      <div
        className="site-text-edit-popover panel-luxury rounded-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-text-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="site-text-edit-popover-header">
          <h3 id="site-text-edit-title" className="text-sm font-semibold text-xdj-gold">
            {t("admin.siteTextEditTitle")}
          </h3>
          <button type="button" onClick={closeSiteTextEditor} className="site-text-edit-close" aria-label={t("common.back")}>
            ×
          </button>
        </div>

        <code className="site-text-edit-key">{key}</code>
        <p className="text-[10px] text-xdj-muted mt-2 mb-1">{t("admin.textEditorDefault")}</p>
        <p className="text-xs text-xdj-muted mb-3 whitespace-pre-wrap">{defaultValue}</p>

        <label className="block text-[10px] text-xdj-cyan uppercase tracking-wider mb-1">
          {t("admin.textEditorCustom")}
        </label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={defaultValue}
          rows={4}
          className="input-luxury w-full px-3 py-2 text-sm rounded-sm resize-y min-h-[88px]"
          dir={dir}
          autoFocus
        />
        <p className="text-[10px] text-xdj-muted mt-2">{t("admin.textEditorVarsHint")}</p>

        {error ? (
          <p className="text-xs text-xdj-orange mt-2" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 mt-4 justify-end">
          <button type="button" onClick={handleReset} className="btn-luxury px-3 py-2 rounded-sm text-xs">
            {t("admin.textEditorResetKey")}
          </button>
          <button type="button" onClick={closeSiteTextEditor} className="btn-luxury px-3 py-2 rounded-sm text-xs">
            {t("common.back")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-luxury-primary px-4 py-2 rounded-sm text-xs disabled:opacity-40"
          >
            {saving ? t("common.saving") : t("admin.textEditorSave")}
          </button>
        </div>
      </div>
    </div>
  );
}
