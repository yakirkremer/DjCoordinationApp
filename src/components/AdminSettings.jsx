import React, { useState } from "react";
import { THEMES, getThemeLabel } from "../lib/themes";
import { PLAYER_STYLES, BROWSER_STYLES } from "../lib/designStyles";
import { WAVEFORM_STYLES } from "../lib/waveformStyles";
import {
  BROWSER_ROW_SIZES,
  DEFAULT_BROWSER_ROW_SIZE_ID,
  getBrowserRowSizeDesc,
  getBrowserRowSizeLabel,
} from "../lib/browserRowSize";
import DesignStylePicker from "./DesignStylePicker";
import { LOCALE_LABELS, LOCALES } from "../lib/i18n/translations";
import { normalizeGenres, sanitizeGenreName } from "../lib/categories";
import { normalizeDropTypes } from "../lib/dropTypes";
import {
  getDefaultHexForDrop,
  getDropTypeStyle,
  normalizeDropTypeColors,
} from "../lib/dropTypeColors";
import { downloadBackupArchive } from "../lib/api/backupApi";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";

function initGenreRows(genres) {
  return normalizeGenres(genres).map((name) => ({
    key: name,
    name,
    original: name,
  }));
}

export default function AdminSettings({ tracks = [], onGenresChanged }) {
  const { settings, updateSettings } = useAppSettingsContext();
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState(() => ({
    defaultLocale: settings.defaultLocale,
    theme: settings.theme,
    playerStyle: settings.playerStyle ?? "xdj-deck",
    browserStyle: settings.browserStyle ?? "xdj-hardware",
    browserRowSize: settings.browserRowSize ?? DEFAULT_BROWSER_ROW_SIZE_ID,
    waveformStyle: settings.waveformStyle ?? "classic",
    genres: initGenreRows(settings.genres),
    dropTypes: normalizeDropTypes(settings.dropTypes),
    dropTypeColors: normalizeDropTypeColors(settings.dropTypes, settings.dropTypeColors),
  }));
  const [newGenre, setNewGenre] = useState("");
  const [newDropType, setNewDropType] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const themeName = (theme) => getThemeLabel(theme, locale);

  const handleGenreNameChange = (key, value) => {
    setDraft((d) => ({
      ...d,
      genres: d.genres.map((g) => (g.key === key ? { ...g, name: value } : g)),
    }));
  };

  const handleAddGenre = () => {
    const name = sanitizeGenreName(newGenre);
    if (!name) return;
    if (draft.genres.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      setError(t("admin.genreDuplicate"));
      return;
    }
    setError("");
    setDraft((d) => ({
      ...d,
      genres: [...d.genres, { key: `new_${Date.now()}`, name, original: "" }],
    }));
    setNewGenre("");
  };

  const handleRemoveGenre = (key) => {
    const row = draft.genres.find((g) => g.key === key);
    if (!row) return;
    const label = row.original || row.name;
    const inUse = tracks.some((track) => track.bucket === label || track.bucket === row.name);
    if (inUse) {
      setError(t("admin.genreInUse", { genre: label }));
      return;
    }
    setError("");
    setDraft((d) => ({
      ...d,
      genres: d.genres.filter((g) => g.key !== key),
    }));
  };

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
    setError("");

    try {
      const genres = normalizeGenres(draft.genres.map((g) => sanitizeGenreName(g.name)));
      if (genres.length === 0) {
        setError(t("admin.genreRequired"));
        return;
      }

      const genreRenames = draft.genres
        .filter((g) => g.original && sanitizeGenreName(g.name) && g.original !== sanitizeGenreName(g.name))
        .map((g) => ({ from: g.original, to: sanitizeGenreName(g.name) }));

      const genreRemoved = settings.genres.filter(
        (g) => !genres.some((name) => name.toLowerCase() === g.toLowerCase())
      );

      for (const name of genreRemoved) {
        if (tracks.some((track) => track.bucket === name)) {
          setError(t("admin.genreInUse", { genre: name }));
          return;
        }
      }

      const dropTypes = normalizeDropTypes(draft.dropTypes);
      await updateSettings({
        defaultLocale: draft.defaultLocale,
        theme: draft.theme,
        playerStyle: draft.playerStyle,
        browserStyle: draft.browserStyle,
        browserRowSize: draft.browserRowSize,
        waveformStyle: draft.waveformStyle,
        genres,
        genreRenames,
        genreRemoved,
        dropTypes,
        dropTypeColors: normalizeDropTypeColors(dropTypes, draft.dropTypeColors),
      });

      setDraft((d) => ({
        ...d,
        genres: genres.map((name) => ({ key: name, name, original: name })),
      }));

      if (genreRenames.length > 0 || genreRemoved.length > 0 || genres.some((g) => !settings.genres.includes(g))) {
        await onGenresChanged?.();
      }

      setSaved(true);
    } catch (err) {
      setError(err.message || t("admin.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = async () => {
    setError("");
    setExporting(true);
    try {
      await downloadBackupArchive();
    } catch (err) {
      setError(err.message || "Backup export failed");
    } finally {
      setExporting(false);
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
          <label className="block text-xs font-semibold text-xdj-text mb-2">{t("admin.defaultPlayerStyle")}</label>
          <DesignStylePicker
            styles={PLAYER_STYLES}
            value={draft.playerStyle}
            onChange={(id) => setDraft((d) => ({ ...d, playerStyle: id }))}
            locale={locale}
          />
          <p className="text-[10px] text-xdj-muted mt-2">{t("admin.playerStyleHint")}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-xdj-text mb-2">{t("admin.defaultBrowserStyle")}</label>
          <DesignStylePicker
            styles={BROWSER_STYLES}
            value={draft.browserStyle}
            onChange={(id) => setDraft((d) => ({ ...d, browserStyle: id }))}
            locale={locale}
          />
          <p className="text-[10px] text-xdj-muted mt-2">{t("admin.browserStyleHint")}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-xdj-text mb-2">{t("admin.browserRowSize")}</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {BROWSER_ROW_SIZES.map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, browserRowSize: size.id }))}
                className={`design-style-card text-start ${draft.browserRowSize === size.id ? "is-active" : ""}`}
                aria-pressed={draft.browserRowSize === size.id}
              >
                <span className="design-style-card-name">{getBrowserRowSizeLabel(size, locale)}</span>
                <span className="design-style-card-desc">{getBrowserRowSizeDesc(size, locale)}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-xdj-muted mt-2">{t("admin.browserRowSizeHint")}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-xdj-text mb-2">{t("admin.defaultWaveformStyle")}</label>
          <DesignStylePicker
            styles={WAVEFORM_STYLES}
            value={draft.waveformStyle}
            onChange={(id) => setDraft((d) => ({ ...d, waveformStyle: id }))}
            locale={locale}
          />
          <p className="text-[10px] text-xdj-muted mt-2">{t("admin.waveformStyleHint")}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-xdj-text mb-2">{t("admin.genresTitle")}</label>
          <p className="text-[10px] text-xdj-muted mb-3">{t("admin.genresHint")}</p>
          <div className="admin-drop-type-list flex flex-col gap-2 mb-3">
            {draft.genres.map((genre) => (
              <div key={genre.key} className="admin-drop-type-row">
                <input
                  type="text"
                  value={genre.name}
                  onChange={(e) => handleGenreNameChange(genre.key, e.target.value)}
                  className="input-luxury px-3 py-2 text-xs rounded-sm flex-1 min-w-[8rem]"
                  aria-label={t("admin.genreName")}
                />
                <span className="text-[10px] text-xdj-muted font-mono hidden sm:inline">
                  /music/{sanitizeGenreName(genre.name) || "…"}/analyzed/
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveGenre(genre.key)}
                  disabled={draft.genres.length <= 1}
                  className="admin-drop-type-remove text-xdj-muted hover:text-red-300 disabled:opacity-30"
                  aria-label={t("admin.removeGenre", { genre: genre.name })}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddGenre();
                }
              }}
              placeholder={t("admin.genrePlaceholder")}
              className="input-luxury px-3 py-2 text-xs rounded-sm flex-1 min-w-[10rem]"
            />
            <button
              type="button"
              onClick={handleAddGenre}
              className="btn-luxury-secondary px-4 py-2 rounded-sm text-xs min-h-[36px]"
            >
              {t("admin.addGenre")}
            </button>
          </div>
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

      {error ? <p className="text-xs text-xdj-orange mt-4">{error}</p> : null}

      <div className="mt-8 border border-xdj-border/40 rounded-sm p-4 bg-black/20">
        <p className="text-xs font-semibold text-xdj-text mb-1">Backup export</p>
        <p className="text-[10px] text-xdj-muted mb-3">
          Download full site data and music as one archive (`data` + `music`) to restore locally.
        </p>
        <button
          type="button"
          onClick={handleExportBackup}
          disabled={exporting}
          className="btn-luxury-secondary px-4 py-2 rounded-sm text-xs min-h-[36px] disabled:opacity-40"
        >
          {exporting ? "Exporting..." : "Download full backup"}
        </button>
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
