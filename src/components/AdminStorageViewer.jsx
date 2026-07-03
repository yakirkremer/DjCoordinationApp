import React, { useCallback, useEffect, useState } from "react";
import {
  fetchStorageDirectory,
  fetchStorageFile,
  getStorageDownloadUrl,
} from "../lib/api/storageBrowseApi";
import { useI18n } from "../lib/i18n/AppSettingsContext";

function formatBytes(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminStorageViewer() {
  const { t, dir } = useI18n();
  const [currentDir, setCurrentDir] = useState("");
  const [storageRoot, setStorageRoot] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const [filePreview, setFilePreview] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState("");

  const loadDirectory = useCallback(async (dirPath) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchStorageDirectory(dirPath);
      setStorageRoot(data.storageRoot ?? "");
      setCurrentDir(data.dir ?? "");
      setEntries(data.entries ?? []);
    } catch (err) {
      setError(err.message || t("admin.storageLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchStorageDirectory(currentDir);
        if (cancelled) return;
        setStorageRoot(data.storageRoot ?? "");
        setEntries(data.entries ?? []);
      } catch (err) {
        if (!cancelled) setError(err.message || t("admin.storageLoadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentDir, t]);

  const openDirectory = (entry) => {
    if (entry.type !== "dir") return;
    setSelectedPath("");
    setFilePreview(null);
    setFileError("");
    setCurrentDir(entry.path);
  };

  const openFile = async (entry) => {
    if (entry.type !== "file") return;
    setSelectedPath(entry.path);
    setFileLoading(true);
    setFileError("");
    setFilePreview(null);
    try {
      const data = await fetchStorageFile(entry.path);
      setFilePreview(data);
    } catch (err) {
      setFileError(err.message || t("admin.storageFileFailed"));
    } finally {
      setFileLoading(false);
    }
  };

  const crumbs = currentDir ? currentDir.split("/").filter(Boolean) : [];

  const goUp = () => {
    if (!currentDir) return;
    const parts = currentDir.split("/").filter(Boolean);
    parts.pop();
    setSelectedPath("");
    setFilePreview(null);
    setFileError("");
    setCurrentDir(parts.join("/"));
  };

  return (
    <section className="admin-storage-viewer flex flex-col gap-4" dir={dir}>
      <div className="panel-luxury rounded-sm p-4 sm:p-5">
        <p className="font-lcd text-[10px] tracking-[0.25em] text-xdj-cyan uppercase mb-1">
          {t("admin.storageTitle")}
        </p>
        <h2 className="text-sm font-semibold text-xdj-gold mb-1">{t("admin.storageHeading")}</h2>
        <p className="text-xs text-xdj-muted">{t("admin.storageHint")}</p>
        {storageRoot ? (
          <p className="text-[10px] text-xdj-muted mt-2 font-mono break-all" dir="ltr">
            {storageRoot}
          </p>
        ) : null}
      </div>

      <div className="admin-storage-layout flex flex-col lg:flex-row gap-4 min-h-0 flex-1">
        <div className="panel-luxury rounded-sm p-3 sm:p-4 flex flex-col gap-3 lg:w-[min(100%,420px)] shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadDirectory(currentDir)}
              disabled={loading}
              className="btn-luxury px-3 py-1.5 rounded-sm text-xs disabled:opacity-40"
            >
              {loading ? t("common.loading") : t("admin.storageRefresh")}
            </button>
            {currentDir ? (
              <button
                type="button"
                onClick={goUp}
                className="btn-luxury px-3 py-1.5 rounded-sm text-xs"
              >
                {t("admin.storageUp")}
              </button>
            ) : null}
          </div>

          <nav className="text-[10px] text-xdj-muted font-mono break-all" dir="ltr" aria-label="Path">
            <button
              type="button"
              onClick={() => {
                setSelectedPath("");
                setFilePreview(null);
                setCurrentDir("");
              }}
              className="text-xdj-cyan hover:text-xdj-gold"
            >
              /
            </button>
            {crumbs.map((part, index) => {
              const path = crumbs.slice(0, index + 1).join("/");
              return (
                <span key={path}>
                  <span className="mx-1">/</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPath("");
                      setFilePreview(null);
                      setCurrentDir(path);
                    }}
                    className="text-xdj-cyan hover:text-xdj-gold"
                  >
                    {part}
                  </button>
                </span>
              );
            })}
          </nav>

          {error ? <p className="text-xs text-xdj-orange">{error}</p> : null}

          <div className="admin-storage-list border border-xdj-border/40 rounded-sm overflow-hidden max-h-[min(60vh,520px)] overflow-y-auto">
            {loading ? (
              <p className="text-xs text-xdj-muted p-4 text-center">{t("common.loading")}</p>
            ) : entries.length === 0 ? (
              <p className="text-xs text-xdj-muted p-4 text-center">{t("admin.storageEmpty")}</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-xdj-screen text-xdj-muted">
                  <tr>
                    <th className="text-right p-2 font-normal">{t("admin.storageColName")}</th>
                    <th className="text-right p-2 font-normal w-20">{t("admin.storageColSize")}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const isSelected = selectedPath === entry.path;
                    return (
                      <tr
                        key={entry.path}
                        className={`border-t border-xdj-border/30 cursor-pointer hover:bg-xdj-cyan/5 ${
                          isSelected ? "bg-xdj-cyan/10" : ""
                        }`}
                        onClick={() =>
                          entry.type === "dir" ? openDirectory(entry) : openFile(entry)
                        }
                      >
                        <td className="p-2">
                          <span className="mr-1">{entry.type === "dir" ? "📁" : "📄"}</span>
                          <span className="font-mono text-xdj-text break-all" dir="ltr">
                            {entry.name}
                          </span>
                        </td>
                        <td className="p-2 text-xdj-muted whitespace-nowrap">
                          {formatBytes(entry.size)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="panel-luxury rounded-sm p-3 sm:p-4 flex flex-col gap-3 flex-1 min-h-[280px] min-w-0">
          {!selectedPath ? (
            <p className="text-xs text-xdj-muted">{t("admin.storageSelectFile")}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-xdj-muted uppercase tracking-wider">
                    {t("admin.storagePreview")}
                  </p>
                  <p className="font-mono text-xs text-xdj-cyan break-all" dir="ltr">
                    {selectedPath}
                  </p>
                  {filePreview ? (
                    <p className="text-[10px] text-xdj-muted mt-1">
                      {formatBytes(filePreview.size)} · {formatDate(filePreview.modifiedAt)}
                    </p>
                  ) : null}
                </div>
                <a
                  href={getStorageDownloadUrl(selectedPath)}
                  className="btn-luxury-primary px-3 py-1.5 rounded-sm text-xs shrink-0"
                  download
                >
                  {t("admin.storageDownload")}
                </a>
              </div>

              {fileLoading ? (
                <p className="text-xs text-xdj-muted">{t("common.loading")}</p>
              ) : null}
              {fileError ? <p className="text-xs text-xdj-orange">{fileError}</p> : null}

              {filePreview && !fileLoading ? (
                filePreview.previewable ? (
                  <textarea
                    readOnly
                    value={filePreview.content ?? ""}
                    className="input-luxury w-full flex-1 min-h-[240px] px-3 py-2 text-xs font-mono rounded-sm resize-y"
                    dir="ltr"
                    spellCheck={false}
                  />
                ) : (
                  <p className="text-xs text-xdj-muted">{t("admin.storageBinaryHint")}</p>
                )
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
