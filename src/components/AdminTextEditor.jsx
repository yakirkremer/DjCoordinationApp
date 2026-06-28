import React, { useMemo, useState } from "react";
import {
  flattenTranslationKeys,
  groupTranslationKeys,
  normalizeTextOverrides,
  TEXT_OVERRIDE_LOCALES,
} from "../lib/i18n/textOverrides";
import { LOCALE_LABELS } from "../lib/i18n/translations";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";

function countOverrides(overrides, locale) {
  return Object.keys(overrides?.[locale] ?? {}).length;
}

export default function AdminTextEditor() {
  const { settings, updateSettings } = useAppSettingsContext();
  const { t, dir } = useI18n();
  const savedOverrides = useMemo(
    () => normalizeTextOverrides(settings.textOverrides),
    [settings.textOverrides]
  );

  const [editLocale, setEditLocale] = useState(settings.defaultLocale === "en" ? "en" : "he");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState(() => ({ ...savedOverrides }));
  const [openSections, setOpenSections] = useState(() => new Set(["welcome", "home", "wizard"]));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const allKeys = useMemo(() => flattenTranslationKeys(editLocale), [editLocale]);

  const filteredKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allKeys;
    return allKeys.filter(({ key, defaultValue }) => {
      const custom = draft[editLocale]?.[key] ?? "";
      return (
        key.toLowerCase().includes(q) ||
        defaultValue.toLowerCase().includes(q) ||
        custom.toLowerCase().includes(q)
      );
    });
  }, [allKeys, search, draft, editLocale]);

  const groups = useMemo(() => groupTranslationKeys(filteredKeys), [filteredKeys]);

  const dirty =
    JSON.stringify(normalizeTextOverrides(draft)) !== JSON.stringify(savedOverrides);

  const setOverride = (key, value) => {
    setSaved(false);
    setDraft((prev) => {
      const localeDraft = { ...(prev[editLocale] ?? {}) };
      const trimmed = value.trim();
      if (trimmed) localeDraft[key] = value;
      else delete localeDraft[key];
      return { ...prev, [editLocale]: localeDraft };
    });
  };

  const resetKey = (key) => {
    setSaved(false);
    setDraft((prev) => {
      const localeDraft = { ...(prev[editLocale] ?? {}) };
      delete localeDraft[key];
      return { ...prev, [editLocale]: localeDraft };
    });
  };

  const resetLocale = () => {
    if (!window.confirm(t("admin.textEditorResetLocale", { locale: LOCALE_LABELS[editLocale] }))) {
      return;
    }
    setSaved(false);
    setDraft((prev) => ({ ...prev, [editLocale]: {} }));
  };

  const toggleSection = (section) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateSettings({ textOverrides: normalizeTextOverrides(draft) });
      setSaved(true);
    } catch (err) {
      setError(err.message || t("admin.textEditorFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-text-editor flex flex-col flex-1 min-h-0 gap-4" dir={dir}>
      <div className="panel-luxury rounded-sm p-4 sm:p-5 shrink-0">
        <p className="font-lcd text-[10px] tracking-[0.25em] text-xdj-cyan uppercase mb-1">
          {t("admin.tabs.copy")}
        </p>
        <h2 className="text-lg font-semibold text-xdj-gold mb-1">{t("admin.textEditorTitle")}</h2>
        <p className="text-xs text-xdj-muted max-w-3xl leading-relaxed">{t("admin.textEditorSubtitle")}</p>
        <p className="text-[11px] text-xdj-muted mt-2 max-w-3xl">{t("admin.textEditorVarsHint")}</p>
        <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-xdj-muted">
          <span>{t("admin.textEditorFormNote")}</span>
        </div>
      </div>

      <div className="admin-text-editor-toolbar panel-luxury rounded-sm p-3 sm:p-4 flex flex-wrap gap-3 items-end shrink-0">
        <div>
          <label className="block text-[10px] text-xdj-cyan uppercase tracking-wider mb-1">
            {t("admin.textEditorLocale")}
          </label>
          <div className="flex gap-2">
            {TEXT_OVERRIDE_LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setEditLocale(loc)}
                className={`btn-luxury px-3 py-2 rounded-sm text-xs ${editLocale === loc ? "border-xdj-cyan text-xdj-cyan" : ""}`}
              >
                {LOCALE_LABELS[loc]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[12rem]">
          <label className="block text-[10px] text-xdj-cyan uppercase tracking-wider mb-1">
            {t("admin.textEditorSearch")}
          </label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.textEditorSearch")}
            className="input-luxury w-full px-3 py-2 text-sm rounded-sm min-h-[40px]"
          />
        </div>

        <span className="text-[10px] text-xdj-muted font-lcd">
          {t("admin.textEditorOverrideCount", {
            count: countOverrides(draft, editLocale),
            locale: LOCALE_LABELS[editLocale],
          })}
        </span>

        <button type="button" onClick={resetLocale} className="btn-luxury px-3 py-2 rounded-sm text-xs">
          {t("admin.textEditorResetLocale", { locale: LOCALE_LABELS[editLocale] })}
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="btn-luxury-primary px-4 py-2 rounded-sm text-xs disabled:opacity-40"
        >
          {saving ? t("common.saving") : t("admin.textEditorSave")}
        </button>
      </div>

      {error ? (
        <p className="text-xs text-xdj-orange px-1" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? <p className="text-xs text-xdj-cyan px-1">{t("admin.textEditorSaved")}</p> : null}

      <div className="admin-text-editor-scroll flex-1 min-h-0 overflow-y-auto panel-luxury rounded-sm p-3 sm:p-4">
        {groups.length === 0 ? (
          <p className="text-sm text-xdj-muted text-center py-8">{t("admin.textEditorNoResults")}</p>
        ) : (
          groups.map(([section, items]) => {
            const open = openSections.has(section) || Boolean(search.trim());
            return (
              <div key={section} className="admin-text-section mb-3 last:mb-0">
                <button
                  type="button"
                  onClick={() => toggleSection(section)}
                  className="admin-text-section-toggle w-full flex items-center justify-between gap-2 py-2 px-1 text-left"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-xdj-gold">{section}</span>
                  <span className="text-[10px] text-xdj-muted">{items.length}</span>
                </button>
                {open ? (
                  <div className="admin-text-section-body flex flex-col gap-3 pb-2">
                    {items.map(({ key, defaultValue }) => {
                      const override = draft[editLocale]?.[key] ?? "";
                      const hasOverride = Boolean(override.trim());
                      return (
                        <div key={key} className="admin-text-row border border-xdj-border rounded-sm p-3 bg-[#0a0a0c]">
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <code className="text-[10px] text-xdj-cyan font-mono break-all">{key}</code>
                            {hasOverride ? (
                              <button
                                type="button"
                                onClick={() => resetKey(key)}
                                className="text-[10px] text-xdj-muted hover:text-xdj-orange"
                              >
                                {t("admin.textEditorResetKey")}
                              </button>
                            ) : null}
                          </div>
                          <p className="text-[10px] text-xdj-muted mb-1">{t("admin.textEditorDefault")}</p>
                          <p className="text-xs text-xdj-muted mb-2 whitespace-pre-wrap">{defaultValue}</p>
                          <label className="block text-[10px] text-xdj-cyan mb-1">{t("admin.textEditorCustom")}</label>
                          <textarea
                            value={override}
                            onChange={(e) => setOverride(key, e.target.value)}
                            placeholder={defaultValue}
                            rows={Math.min(4, Math.max(2, Math.ceil(defaultValue.length / 48)))}
                            className="input-luxury w-full px-3 py-2 text-sm rounded-sm resize-y min-h-[44px]"
                            dir={editLocale === "he" ? "rtl" : "ltr"}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
