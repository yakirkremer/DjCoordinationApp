import React, { useState } from "react";
import { OFFICIAL_CATEGORIES } from "../lib/categories";
import { stripAudioExtension } from "../lib/audioFormats";
import { ensureTrackVersions } from "../lib/trackVersions";

function formatSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function DropboxImportPanel({ dropbox, existingTracks, onImported }) {
  const [bucket, setBucket] = useState(OFFICIAL_CATEGORIES[0]);
  const {
    isConfigured,
    canBrowse,
    accountEmail,
    browsePath,
    entries,
    selected,
    loading,
    importing,
    error,
    status,
    connect,
    disconnect,
    openFolder,
    goUp,
    toggleSelect,
    selectAllAudio,
    clearSelection,
    importSelected,
    refreshFolder,
  } = dropbox;

  const existingFilenames = new Set(
    existingTracks
      .filter((t) => t.bucket === bucket)
      .flatMap((t) => {
        const normalized = ensureTrackVersions(t);
        return (normalized.versions || []).map((v) => v.filename).filter(Boolean);
      })
  );

  const catalogNameFromDropbox = (filename) => `${stripAudioExtension(filename)}.mp3`;

  const handleImport = async () => {
    const result = await importSelected(bucket);
    if (result?.imported?.length) {
      onImported(result.imported);
    }
  };

  if (!isConfigured) {
    return (
      <section className="panel-luxury rounded-sm p-4" dir="rtl">
        <p className="font-lcd text-[10px] tracking-[0.2em] text-xdj-cyan uppercase">Dropbox Import</p>
        <p className="text-xs text-xdj-muted mt-2">
          הוסף <code>VITE_DROPBOX_APP_KEY</code> ל-<code>.env</code> והפעל מחדש את השרת.
        </p>
      </section>
    );
  }

  return (
    <section className="panel-luxury rounded-sm p-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <p className="font-lcd text-[10px] tracking-[0.2em] text-xdj-cyan uppercase">Dropbox Import</p>
          <h2 className="text-sm font-semibold text-xdj-text mt-1">ייבוא שירים מ-Dropbox לשרת</h2>
          <p className="text-[10px] text-xdj-muted mt-1">
            בחרו קבצים מתיקיית Dropbox — הם יישמרו באתר ויופיעו בקטלוג (ללא סטרימינג)
          </p>
        </div>
        {canBrowse ? (
          <button type="button" onClick={disconnect} className="text-xs text-xdj-muted hover:text-xdj-orange">
            נתק
          </button>
        ) : null}
      </div>

      {!canBrowse ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-xdj-muted">
            התחברו ל-Dropbox כדי לעיין בתיקיות ולבחור שירים לייבוא. ניתן גם להגדיר{" "}
            <code>DROPBOX_REFRESH_TOKEN</code> בשרת לגישה ללא התחברות בדפדפן.
          </p>
          <button type="button" onClick={connect} className="btn-luxury-primary px-4 py-2 rounded-sm text-sm min-h-[44px] self-start">
            חבר Dropbox
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {accountEmail && (
            <p className="text-xs text-xdj-muted">
              מחובר: <span className="text-xdj-text">{accountEmail}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goUp}
              disabled={!browsePath}
              className="btn-luxury px-3 py-1.5 rounded-sm text-xs disabled:opacity-40"
            >
              ↑ למעלה
            </button>
            <button
              type="button"
              onClick={() => refreshFolder()}
              disabled={loading}
              className="btn-luxury px-3 py-1.5 rounded-sm text-xs"
            >
              רענן
            </button>
            <span className="font-lcd text-[10px] text-xdj-muted truncate flex-1 min-w-0" dir="ltr">
              {browsePath || "/"}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto border border-xdj-border/50 rounded-sm bg-[#0a0a0c]">
            {loading ? (
              <p className="text-xs text-xdj-muted p-3 text-center">טוען...</p>
            ) : entries.length === 0 ? (
              <p className="text-xs text-xdj-muted p-3 text-center">אין קבצים בתיקייה</p>
            ) : (
              <ul className="divide-y divide-xdj-border/30">
                {entries.map((entry) => {
                  if (entry.isFolder) {
                    return (
                      <li key={entry.path}>
                        <button
                          type="button"
                          onClick={() => openFolder(entry.path)}
                          className="w-full text-right px-3 py-2 text-sm hover:bg-xdj-cyan/5 flex items-center gap-2"
                        >
                          <span>📁</span>
                          <span>{entry.name}</span>
                        </button>
                      </li>
                    );
                  }

                  if (!entry.isAudio && !entry.isMp3) return null;

                  const catalogName = catalogNameFromDropbox(entry.name);
                  const alreadyLocal =
                    existingFilenames.has(catalogName) || existingFilenames.has(entry.name);
                  const checked = selected.has(entry.path);

                  return (
                    <li key={entry.path}>
                      <label className="flex items-center gap-3 px-3 py-2 hover:bg-xdj-cyan/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelect(entry.path)}
                          className="shrink-0"
                        />
                        <span className="flex-1 min-w-0 text-sm truncate" dir="ltr">
                          {entry.name}
                        </span>
                        <span className="text-[10px] text-xdj-muted shrink-0">{formatSize(entry.size)}</span>
                        {alreadyLocal && (
                          <span className="text-[10px] text-xdj-gold shrink-0">בקטלוג</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={selectAllAudio} className="text-xs text-xdj-cyan hover:underline">
              בחר הכל
            </button>
            <button type="button" onClick={clearSelection} className="text-xs text-xdj-muted hover:underline">
              נקה בחירה
            </button>
            <span className="text-xs text-xdj-muted mr-auto">{selected.size} נבחרו</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <label className="flex flex-col gap-1 flex-1">
              <span className="font-lcd text-[10px] text-xdj-muted uppercase">קטגוריה לייבוא</span>
              <select
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className="input-luxury px-3 py-2 text-sm rounded-sm min-h-[44px]"
              >
                {OFFICIAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              className="btn-luxury-primary px-6 py-2 rounded-sm text-sm min-h-[44px] disabled:opacity-40 sm:self-end"
            >
              {importing ? "מייבא..." : "ייבא לקטלוג"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-xdj-orange mt-2">{error}</p>}
      {status && <p className="text-xs text-xdj-cyan mt-2">{status}</p>}
    </section>
  );
}
