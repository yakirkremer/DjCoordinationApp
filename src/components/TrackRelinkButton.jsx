import React, { useCallback, useEffect, useState } from "react";
import { useGenres } from "../hooks/useGenres";
import { listMusicFiles, relinkTrackToFile } from "../lib/api/uploadTrack";
import { useI18n } from "../lib/i18n/AppSettingsContext";

function formatSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function TrackRelinkButton({
  track,
  versionId,
  onReloaded,
  className = "",
  label,
  compact = false,
}) {
  const { t } = useI18n();
  const genres = useGenres();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState(() => track.bucket || genres[0] || "");
  const [selected, setSelected] = useState(null);

  const buttonLabel = label || t("admin.relinkExisting");

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listMusicFiles({
        bucket: bucketFilter || undefined,
        search: search.trim() || undefined,
      });
      setFiles(list);
    } catch (err) {
      setError(err.message || t("admin.relinkLoadFailed"));
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [bucketFilter, search, t]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(loadFiles, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, loadFiles, search]);

  useEffect(() => {
    if (open && track.bucket && genres.includes(track.bucket)) {
      setBucketFilter(track.bucket);
    }
  }, [open, track.bucket, genres]);

  const handleOpen = () => {
    if (status === "linking") return;
    setError("");
    setSelected(null);
    setSearch("");
    setOpen(true);
  };

  const handleClose = () => {
    if (status === "linking") return;
    setOpen(false);
    setSelected(null);
    setError("");
  };

  const handleRelink = async () => {
    if (!selected) return;
    setStatus("linking");
    setError("");

    try {
      const updated = await relinkTrackToFile({
        trackId: track.id,
        versionId,
        bucket: selected.bucket,
        filename: selected.filename,
      });
      onReloaded?.(updated);
      setStatus("success");
      setOpen(false);
      setSelected(null);
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setError(err.message || t("admin.relinkFailed"));
      setStatus("idle");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={status === "linking"}
        className={
          compact
            ? "text-[10px] text-xdj-gold hover:text-xdj-orange px-1.5 py-0.5 rounded border border-xdj-gold/40 hover:border-xdj-orange/50 disabled:opacity-40 whitespace-nowrap"
            : `btn-luxury-secondary px-3 py-1.5 rounded-sm text-xs min-h-[36px] disabled:opacity-40 ${className}`
        }
        title={t("admin.relinkExistingHelp")}
      >
        {status === "linking" ? t("admin.relinking") : status === "success" ? t("admin.relinkDone") : buttonLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-label={t("admin.relinkDialogTitle")}
          onClick={handleClose}
        >
          <div
            className="panel-luxury rounded-sm w-full max-w-2xl max-h-[min(85vh,720px)] flex flex-col shadow-2xl border border-xdj-border"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-xdj-border shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-lcd text-[10px] tracking-[0.2em] text-xdj-cyan uppercase">
                    {t("admin.relinkDialogTitle")}
                  </p>
                  <h3 className="text-sm font-semibold text-xdj-text mt-1">
                    {track.title}
                    {track.artist ? ` — ${track.artist}` : ""}
                  </h3>
                  <p className="text-[10px] text-xdj-muted mt-1">{t("admin.relinkExistingHelp")}</p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-xdj-muted hover:text-xdj-text px-2 py-1 text-lg leading-none"
                  aria-label={t("common.close")}
                >
                  ×
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("admin.relinkSearchPlaceholder")}
                  className="input-luxury flex-1 min-w-[160px] px-2 py-1.5 text-xs rounded-sm"
                  autoFocus
                />
                <select
                  value={bucketFilter}
                  onChange={(e) => setBucketFilter(e.target.value)}
                  className="input-luxury px-2 py-1.5 text-xs rounded-sm"
                >
                  <option value="">{t("admin.relinkAllCategories")}</option>
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={loadFiles}
                  disabled={loading}
                  className="text-[10px] font-bold text-xdj-cyan px-2 py-1.5 rounded border border-xdj-cyan/50 disabled:opacity-40"
                >
                  {loading ? t("admin.checking") : t("admin.relinkRefresh")}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              {loading && files.length === 0 ? (
                <p className="text-xs text-xdj-muted p-3 text-center">{t("admin.relinkLoading")}</p>
              ) : files.length === 0 ? (
                <p className="text-xs text-xdj-muted p-3 text-center">{t("admin.relinkNoFiles")}</p>
              ) : (
                <ul className="space-y-1">
                  {files.map((file) => {
                    const key = `${file.bucket}\0${file.filename}`;
                    const isSelected =
                      selected?.bucket === file.bucket && selected?.filename === file.filename;
                    const linkedCount = file.linkedVersions?.length || 0;

                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => setSelected(file)}
                          className={`w-full text-right px-3 py-2 rounded border transition-colors ${
                            isSelected
                              ? "border-xdj-gold bg-xdj-gold/10 text-xdj-text"
                              : "border-xdj-border/60 hover:border-xdj-cyan/40 text-gray-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-xs break-all">{file.filename}</span>
                            <span className="text-[10px] text-xdj-muted shrink-0">{formatSize(file.sizeBytes)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] text-xdj-cyan">{file.bucket}</span>
                            {linkedCount > 0 ? (
                              <span className="text-[10px] text-xdj-muted">
                                {t("admin.relinkLinkedCount", { count: linkedCount })}
                              </span>
                            ) : (
                              <span className="text-[10px] text-green-400/80">{t("admin.relinkUnlinked")}</span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="p-4 border-t border-xdj-border shrink-0 flex flex-col gap-2">
              {error ? <p className="text-[10px] text-xdj-orange">{error}</p> : null}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-[10px] px-3 py-1.5 rounded border border-xdj-border text-xdj-muted"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleRelink}
                  disabled={!selected || status === "linking"}
                  className="btn-luxury-primary px-3 py-1.5 rounded-sm text-xs disabled:opacity-40"
                >
                  {status === "linking" ? t("admin.relinking") : t("admin.relinkConfirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
