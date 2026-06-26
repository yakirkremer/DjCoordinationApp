import React, { useState } from "react";

export default function DropboxPanel({
  dropbox,
  onSync,
  trackCount,
  existingTracks = [],
}) {
  const {
    isConfigured,
    isConnected,
    accountEmail,
    rootPath,
    musicSource,
    lastSyncAt,
    syncing,
    syncProgress,
    error,
    connect,
    disconnect,
    setRootPath,
    setMusicSource,
    syncCatalog,
  } = dropbox;

  const [syncResult, setSyncResult] = useState(null);

  const handleSync = async () => {
    setSyncResult(null);
    try {
      const { tracks, analyzedCount, analyzeFailedCount, totalFound, diagnosticsMessage } =
        await syncCatalog(existingTracks);

      if (totalFound === 0) {
        setSyncResult({
          type: "warn",
          message: diagnosticsMessage,
        });
        return;
      }

      onSync?.(tracks);

      let message =
        analyzedCount > 0
          ? `נמצאו ${totalFound} שירים · ${analyzedCount} חדשים נותחו (librosa)`
          : `נמצאו ${totalFound} שירים (ללא שירים חדשים לניתוח)`;

      if (analyzeFailedCount > 0) {
        message += ` · ${analyzeFailedCount} ניתוחים נכשלו (cue ברירת מחדל 0-60)`;
      }

      setSyncResult({ type: "ok", message });
    } catch {
      // error shown via dropbox.error
    }
  };

  const progressLabel =
    syncProgress?.phase === "analyze"
      ? `מנתח ${syncProgress.current}/${syncProgress.total}: ${syncProgress.filename}`
      : syncProgress?.phase === "skip"
        ? `בודק ${syncProgress.current}/${syncProgress.total}...`
        : syncing
          ? "מסנכרן..."
          : null;

  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString("he-IL")
    : "לא בוצע";

  return (
    <div className="panel-luxury p-4 mb-6 rounded-sm border border-xdj-border" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-lcd text-sm text-xdj-cyan tracking-wider">DROPBOX STREAMING</h3>
          <p className="text-xs text-xdj-muted mt-1">
            שים MP3 ישירות ב-<code className="text-xdj-text">/Genre/</code> — סנכרון מנתח שירים חדשים
            (librosa) בלי להעביר קבצים ב-Dropbox
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isConnected ? (
            <button
              type="button"
              onClick={connect}
              disabled={!isConfigured}
              className="btn-luxury-primary px-4 py-2 rounded-sm text-xs"
            >
              חבר Dropbox
            </button>
          ) : (
            <button type="button" onClick={disconnect} className="btn-luxury px-4 py-2 rounded-sm text-xs">
              נתק
            </button>
          )}
        </div>
      </div>

      {!isConfigured && (
        <p className="text-xs text-xdj-orange mb-3">
          הוסף <code>VITE_DROPBOX_APP_KEY</code> לקובץ <code>.env</code> והפעל מחדש את השרת.
        </p>
      )}

      {isConnected && (
        <p className="text-xs text-xdj-muted mb-3">
          מחובר: <span className="text-xdj-text">{accountEmail || "Dropbox"}</span>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-xdj-muted font-lcd">ROOT FOLDER</span>
          <input
            type="text"
            value={rootPath}
            onChange={(e) => setRootPath(e.target.value)}
            placeholder="/ or empty for App folder"
            className="xdj-az-cue-input w-full"
            dir="ltr"
          />
          <span className="text-[10px] text-xdj-muted">
            App folder app → leave empty. Full Dropbox → e.g. /DJ Pool
          </span>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-xdj-muted font-lcd">MUSIC SOURCE</span>
          <select
            value={musicSource}
            onChange={(e) => setMusicSource(e.target.value)}
            className="xdj-az-cue-input w-full"
          >
            <option value="local">Local files (public/music)</option>
            <option value="dropbox">Dropbox stream</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSync}
          disabled={!isConnected || syncing}
          className="btn-luxury-gold px-4 py-2 rounded-sm text-xs"
        >
          {progressLabel || "סנכרן קטלוג מ-Dropbox"}
        </button>
        <span className="text-xs text-xdj-muted">
          {trackCount} tracks · סנכרון אחרון: {lastSyncLabel}
        </span>
      </div>

      {musicSource === "dropbox" && (
        <p className="text-xs text-xdj-muted mt-3">
          לגישת זוגות מכל מכשיר: הוסף <code>DROPBOX_REFRESH_TOKEN</code> ל-<code>.env</code> (ראה
          .env.example) — השרת ינפיק קישורי סטרימינג ללא התחברות Dropbox לכל משתמש.
        </p>
      )}

      {error && <p className="text-xs text-xdj-orange mt-3">{error}</p>}

      {syncResult && (
        <pre
          className={`text-xs mt-3 whitespace-pre-wrap font-sans ${
            syncResult.type === "ok" ? "text-xdj-cyan" : "text-xdj-orange"
          }`}
        >
          {syncResult.message}
        </pre>
      )}
    </div>
  );
}
