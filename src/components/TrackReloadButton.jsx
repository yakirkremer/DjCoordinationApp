import React, { useRef, useState } from "react";
import { reloadTrackFile } from "../lib/api/uploadTrack";
import { ACCEPT_AUDIO } from "../lib/audioFormats";

export default function TrackReloadButton({
  track,
  onReloaded,
  className = "",
  label = "טען קובץ",
  compact = false,
}) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handlePick = () => {
    if (status === "uploading") return;
    setError("");
    inputRef.current?.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setStatus("uploading");
    setError("");

    try {
      const updated = await reloadTrackFile({
        trackId: track.id,
        file,
        bucket: track.bucket,
        filename: file.name,
      });
      onReloaded?.(updated);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setError(err.message || "טעינה מחדש נכשלה");
      setStatus("idle");
    }
  };

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_AUDIO}
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={handlePick}
        disabled={status === "uploading"}
        className={
          compact
            ? "text-[10px] text-xdj-cyan hover:text-xdj-orange px-1.5 py-0.5 rounded border border-xdj-cyan/40 hover:border-xdj-orange/50 disabled:opacity-40 whitespace-nowrap"
            : "btn-luxury-primary px-3 py-1.5 rounded-sm text-xs min-h-[36px] disabled:opacity-40"
        }
        title="העלה קובץ MP3 או WAV (יומר ל-MP3 128k)"
      >
        {status === "uploading" ? "מעלה..." : status === "success" ? "נשמר ✓" : label}
      </button>
      {error ? <span className="text-[10px] text-xdj-orange max-w-[140px]">{error}</span> : null}
    </div>
  );
}
