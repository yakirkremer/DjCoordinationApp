import React, { useState, useRef, useEffect, useCallback } from "react";
import { useGenres } from "../hooks/useGenres";
import { uploadTrack } from "../lib/api/uploadTrack";
import { ACCEPT_AUDIO, isSupportedAudioFile, stripAudioExtension } from "../lib/audioFormats";

function guessMetaFromFile(file) {
  const base = stripAudioExtension(file.name);
  const parts = base.split(" - ");
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  }
  return { artist: "", title: base };
}

function fileKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function mergeAudioFiles(existing, incoming) {
  const seen = new Set(existing.map(fileKey));
  const next = [...existing];
  for (const file of incoming) {
    if (!isSupportedAudioFile(file)) continue;
    const key = fileKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(file);
  }
  return next;
}

export default function TrackUploadPanel({ onUploaded }) {
  const genres = useGenres();
  const [bucket, setBucket] = useState(() => genres[0]);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    if (!genres.includes(bucket)) {
      setBucket(genres[0]);
    }
  }, [genres, bucket]);

  const isMulti = files.length > 1;
  const isUploading = status === "uploading";

  const syncMetaForSingleFile = useCallback((list) => {
    if (list.length === 1) {
      const meta = guessMetaFromFile(list[0]);
      setTitle(meta.title);
      setArtist(meta.artist);
    } else if (list.length === 0) {
      setTitle("");
      setArtist("");
    } else {
      setTitle("");
      setArtist("");
    }
  }, []);

  const addFiles = useCallback(
    (incoming) => {
      const picked = Array.from(incoming ?? []).filter(isSupportedAudioFile);
      if (!picked.length) {
        setError("רק קבצי MP3 או WAV נתמכים");
        return;
      }
      setFiles((prev) => {
        const next = mergeAudioFiles(prev, picked);
        syncMetaForSingleFile(next);
        return next;
      });
      setError("");
      setLastResult(null);
    },
    [syncMetaForSingleFile]
  );

  const handleFileChange = (e) => {
    addFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (key) => {
    setFiles((prev) => {
      const next = prev.filter((f) => fileKey(f) !== key);
      syncMetaForSingleFile(next);
      return next;
    });
    setError("");
    setLastResult(null);
  };

  const clearFiles = () => {
    setFiles([]);
    setTitle("");
    setArtist("");
    setProgress({ done: 0, total: 0, current: "" });
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length) {
      setError("יש לבחור לפחות קובץ MP3 או WAV אחד");
      return;
    }

    setStatus("uploading");
    setError("");
    setLastResult(null);
    setProgress({ done: 0, total: files.length, current: files[0]?.name ?? "" });

    const imported = [];
    const failed = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const meta = guessMetaFromFile(file);
      setProgress({ done: i, total: files.length, current: file.name });

      try {
        const track = await uploadTrack({
          file,
          bucket,
          title: isMulti ? meta.title : title || meta.title,
          artist: isMulti ? meta.artist : artist || meta.artist,
        });
        imported.push(track);
      } catch (err) {
        failed.push({ name: file.name, error: err.message || "העלאה נכשלה" });
      }
    }

    setProgress({ done: files.length, total: files.length, current: "" });

    if (imported.length) {
      onUploaded(imported);
    }

    if (failed.length === 0) {
      clearFiles();
      setStatus("success");
      setLastResult({ ok: imported.length, failed: 0 });
      setTimeout(() => {
        setStatus("idle");
        setLastResult(null);
      }, 4000);
    } else if (imported.length > 0) {
      setStatus("idle");
      setLastResult({ ok: imported.length, failed: failed.length });
      setError(
        `${imported.length} הועלו, ${failed.length} נכשלו: ${failed
          .slice(0, 3)
          .map((f) => f.name)
          .join(", ")}${failed.length > 3 ? "…" : ""}`
      );
      clearFiles();
    } else {
      setStatus("idle");
      setError(failed[0]?.error || "העלאה נכשלה");
    }
  };

  return (
    <section className="panel-luxury rounded-sm p-4 mb-0" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <p className="font-lcd text-[10px] tracking-[0.2em] text-xdj-cyan uppercase">Upload</p>
          <h2 className="text-sm font-semibold text-xdj-text mt-1">העלאת שירים לקטלוג</h2>
        </div>
        <span className="text-[10px] text-xdj-muted">MP3 / WAV · המרה ל-MP3 128k · עד 80MB לקובץ</span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-lcd text-[10px] text-xdj-muted uppercase">קטגוריה</span>
            <select
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              disabled={isUploading}
              className="input-luxury px-3 py-2 text-sm rounded-sm min-h-[44px]"
            >
              {genres.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1 sm:col-span-1">
            <span className="font-lcd text-[10px] text-xdj-muted uppercase">קבצי MP3 / WAV</span>
            <div
              className={`track-upload-dropzone ${isDragOver ? "is-drag-over" : ""} ${isUploading ? "is-disabled" : ""}`}
              onDragEnter={isUploading ? undefined : handleDragEnter}
              onDragLeave={isUploading ? undefined : handleDragLeave}
              onDragOver={isUploading ? undefined : handleDragOver}
              onDrop={isUploading ? undefined : handleDrop}
              onClick={() => {
                if (!isUploading) inputRef.current?.click();
              }}
              onKeyDown={(e) => {
                if (!isUploading && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={isUploading ? -1 : 0}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_AUDIO}
                multiple
                onChange={handleFileChange}
                disabled={isUploading}
                className="track-upload-dropzone-input"
                aria-label="בחירת קבצי אודיו"
              />
              <div className="track-upload-dropzone-body">
                <p className="track-upload-dropzone-title">
                  {isDragOver ? "שחרר כאן להוספה לרשימה" : "גרור קבצים לכאן"}
                </p>
                <p className="track-upload-dropzone-hint">
                  אפשר לשחרר שיר אחד, ואז עוד — הכל יועלה בלחיצה אחת
                </p>
                <span className="track-upload-dropzone-browse btn-luxury px-3 py-1.5 rounded-sm text-xs">
                  בחר קבצים
                </span>
              </div>
            </div>
          </div>

          {!isMulti ? (
            <>
              <label className="flex flex-col gap-1">
                <span className="font-lcd text-[10px] text-xdj-muted uppercase">שם השיר</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="אופציונלי — ימולא מהקובץ"
                  disabled={isUploading || !files.length}
                  className="input-luxury px-3 py-2 text-sm rounded-sm min-h-[44px]"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-lcd text-[10px] text-xdj-muted uppercase">אמן</span>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="אופציונלי"
                  disabled={isUploading || !files.length}
                  className="input-luxury px-3 py-2 text-sm rounded-sm min-h-[44px]"
                />
              </label>
            </>
          ) : null}
        </div>

        {files.length > 0 ? (
          <div className="rounded-sm border border-xdj-border/50 bg-black/20 px-3 py-2 max-h-40 overflow-y-auto">
            <p className="text-[10px] text-xdj-cyan font-lcd mb-1">
              {files.length} קבצים ברשימה · כולם יועלו לקטגוריה {bucket}
            </p>
            <ul className="text-xs text-xdj-muted space-y-1">
              {files.map((f) => {
                const key = fileKey(f);
                return (
                  <li key={key} className="flex items-center gap-2 min-w-0">
                    <span className="truncate flex-1" title={f.name}>
                      {f.name}
                    </span>
                    {!isUploading ? (
                      <button
                        type="button"
                        onClick={() => removeFile(key)}
                        className="shrink-0 text-[10px] text-xdj-orange hover:text-xdj-text px-1"
                        aria-label={`הסר ${f.name}`}
                      >
                        הסר
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {isUploading ? (
          <p className="text-xs text-xdj-cyan">
            מעלה {progress.done + 1}/{progress.total}
            {progress.current ? ` — ${progress.current}` : ""}
          </p>
        ) : null}

        {error && <p className="text-xs text-xdj-orange">{error}</p>}
        {status === "success" && lastResult ? (
          <p className="text-xs text-xdj-cyan">
            {lastResult.ok} שיר{lastResult.ok === 1 ? "" : "ים"} הועלו בהצלחה לקטלוג
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          {files.length > 0 && !isUploading ? (
            <button
              type="button"
              onClick={clearFiles}
              className="btn-luxury px-4 py-2 rounded-sm text-sm min-h-[44px]"
            >
              נקה הכל
            </button>
          ) : null}
          <button
            type="submit"
            disabled={isUploading || !files.length}
            className="btn-luxury-primary px-6 py-2 rounded-sm text-sm min-h-[44px] disabled:opacity-40"
          >
            {isUploading
              ? "מעלה..."
              : files.length > 1
                ? `העלה ${files.length} שירים`
                : "העלה שיר"}
          </button>
        </div>
      </form>
    </section>
  );
}
