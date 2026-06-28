import React, { useState, useRef } from "react";
import { OFFICIAL_CATEGORIES } from "../lib/categories";
import { uploadTrack } from "../lib/api/uploadTrack";

function guessMetaFromFile(file) {
  const base = file.name.replace(/\.mp3$/i, "");
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
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setError("");
    if (picked) {
      const meta = guessMetaFromFile(picked);
      setTitle(meta.title);
      setArtist(meta.artist);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("יש לבחור קובץ MP3");
      return;
    }

    setStatus("uploading");
    setError("");

    try {
      const track = await uploadTrack({ file, bucket, title, artist });
      onUploaded(track);
      setFile(null);
      setTitle("");
      setArtist("");
      if (inputRef.current) inputRef.current.value = "";
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setError(err.message || "העלאה נכשלה");
      setStatus("idle");
    }
  };

  return (
    <section className="panel-luxury rounded-sm p-4 mb-0" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <p className="font-lcd text-[10px] tracking-[0.2em] text-xdj-cyan uppercase">Upload</p>
          <h2 className="text-sm font-semibold text-xdj-text mt-1">העלאת שיר לקטלוג</h2>
        </div>
        <span className="text-[10px] text-xdj-muted">MP3 בלבד · עד 80MB</span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-lcd text-[10px] text-xdj-muted uppercase">קטגוריה</span>
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

          <label className="flex flex-col gap-1">
            <span className="font-lcd text-[10px] text-xdj-muted uppercase">קובץ MP3</span>
            <input
              ref={inputRef}
              type="file"
              accept=".mp3,audio/mpeg,audio/mp3"
              onChange={handleFileChange}
              className="input-luxury px-3 py-2 text-sm rounded-sm min-h-[44px] file:mr-3 file:rounded-sm file:border-0 file:bg-xdj-cyan/20 file:px-3 file:py-1 file:text-xdj-cyan"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-lcd text-[10px] text-xdj-muted uppercase">שם השיר</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="אופציונלי — ימולא מהקובץ"
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
              className="input-luxury px-3 py-2 text-sm rounded-sm min-h-[44px]"
            />
          </label>
        </div>

        {error && <p className="text-xs text-xdj-orange">{error}</p>}
        {status === "success" && (
          <p className="text-xs text-xdj-cyan">השיר הועלה בהצלחה ונוסף לקטלוג</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={status === "uploading" || !file}
            className="btn-luxury-primary px-6 py-2 rounded-sm text-sm min-h-[44px] disabled:opacity-40"
          >
            {status === "uploading" ? "מעלה..." : "העלה שיר"}
          </button>
        </div>
      </form>
    </section>
  );
}
