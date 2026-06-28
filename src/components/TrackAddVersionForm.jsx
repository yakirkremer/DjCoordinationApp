import React, { useRef, useState } from "react";
import { ACCEPT_AUDIO, isSupportedAudioFile } from "../lib/audioFormats";
import { addTrackVersion } from "../lib/api/uploadTrack";
import { getDefaultDropType } from "../lib/dropTypes";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";
import DropTypeSelect from "./DropTypeSelect";

export default function TrackAddVersionForm({ track, onAdded }) {
  const { settings } = useAppSettingsContext();
  const { t, dir } = useI18n();
  const inputRef = useRef(null);
  const [drop, setDrop] = useState(() => getDefaultDropType(settings.dropTypes));
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!drop.trim()) {
      setError(t("admin.dropRequired"));
      return;
    }
    if (!file || !isSupportedAudioFile(file)) {
      setError(t("admin.versionFileRequired"));
      return;
    }

    setStatus("uploading");
    setError("");

    try {
      const updated = await addTrackVersion({
        trackId: track.id,
        file,
        drop,
      });
      onAdded?.(updated);
      setDrop(getDefaultDropType(settings.dropTypes));
      if (inputRef.current) inputRef.current.value = "";
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setError(err.message || t("admin.versionAddFailed"));
      setStatus("idle");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="track-add-version-form" dir={dir} onClick={(e) => e.stopPropagation()}>
      <p className="font-lcd text-[10px] text-xdj-cyan uppercase mb-2">{t("admin.addVersion")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <DropTypeSelect
          value={drop}
          onChange={setDrop}
          disabled={status === "uploading"}
          required
        />
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_AUDIO}
          className="input-luxury px-2 py-1.5 text-xs rounded-sm sm:col-span-1"
          disabled={status === "uploading"}
        />
        <button
          type="submit"
          disabled={status === "uploading"}
          className="btn-luxury-primary px-3 py-1.5 rounded-sm text-xs min-h-[36px] disabled:opacity-40"
        >
          {status === "uploading" ? t("common.saving") : t("admin.uploadVersion")}
        </button>
      </div>
      {error ? <p className="text-[10px] text-xdj-orange mt-2">{error}</p> : null}
    </form>
  );
}
