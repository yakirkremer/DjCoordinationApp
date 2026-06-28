import React, { useState, useRef } from "react";
import { OFFICIAL_CATEGORIES } from "../lib/categories";
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

export default function TrackUploadPanel({ onUploaded }) {
  const [bucket, setBucket] = useState(OFFICIAL_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const inputRef = useRef(null);

  const isMulti = files.length > 1;
  const isUploading = status === "uploading";

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files ?? []).filter(isSupportedAudioFile);
    setFiles(picked);
    setError("");
    setLastResult(null);

    if (picked.length === 1) {
      const meta = guessMetaFromFile(picked[0]);
      setTitle(meta.title);
      setArtist(meta.artist);
    } else {
      setTitle("");
      setArtist("");
    }
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
              {OFFICIAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 sm:col-span-1">
            <span className="font-lcd text-[10px] text-xdj-muted uppercase">קבצי MP3 / WAV</span>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_AUDIO}
              multiple
              onChange={handleFileChange}
              disabled={isUploading}
              className="input-luxury px-3 py-2 text-sm rounded-sm min-h-[44px] file:mr-3 file:rounded-sm file:border-0 file:bg-xdj-cyan/20 file:px-3 file:py-1 file:text-xdj-cyan"
            />
          </label>

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
          <div className="rounded-sm border border-xdj-border/50 bg-black/20 px-3 py-2 max-h-32 overflow-y-auto">
            <p className="text-[10px] text-xdj-cyan font-lcd mb-1">
              {files.length} קבצים נבחרו · כולם יועלו לקטגוריה {bucket}
            </p>
            <ul className="text-xs text-xdj-muted space-y-0.5">
              {files.map((f) => (
                <li key={`${f.name}-${f.size}`} className="truncate">
                  {f.name}
                </li>
              ))}
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
              נקה
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
