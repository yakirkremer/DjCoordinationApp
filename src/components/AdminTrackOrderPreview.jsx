import React, { useCallback, useState } from "react";
import TrackList from "./TrackList";
import { useI18n, useAppSettingsContext } from "../lib/i18n/AppSettingsContext";
import { buildGenreOrderList } from "../lib/genreTrackOrder";

const noop = () => {};

export default function AdminTrackOrderPreview({
  tracks,
  genres,
  currentTrack,
  activeVersionIds,
  onSelectVersion,
  isPlaying,
  onTrackSelect,
  formatTime,
}) {
  const { t, dir } = useI18n();
  const { settings, updateSettings } = useAppSettingsContext();
  const genreTrackOrders = settings.genreTrackOrders ?? {};
  const [savingGenre, setSavingGenre] = useState("");
  const [error, setError] = useState("");

  const handleReorderTracks = useCallback(
    async (genre, draggedId, targetId) => {
      const order = buildGenreOrderList(tracks, genre, genreTrackOrders);
      const from = order.indexOf(draggedId);
      const to = order.indexOf(targetId);
      if (from < 0 || to < 0 || from === to) return;

      const nextOrder = [...order];
      nextOrder.splice(from, 1);
      nextOrder.splice(to, 0, draggedId);

      setSavingGenre(genre);
      setError("");
      try {
        await updateSettings({
          genreTrackOrders: {
            ...genreTrackOrders,
            [genre]: nextOrder,
          },
        });
      } catch (err) {
        setError(err.message || t("admin.trackOrderFailed"));
      } finally {
        setSavingGenre("");
      }
    },
    [tracks, genreTrackOrders, updateSettings, t]
  );

  return (
    <section className="admin-track-order flex flex-col flex-1 min-h-0 gap-3" dir={dir}>
      <div className="xdj-browser-header flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="font-lcd text-xs tracking-[0.25em] text-xdj-cyan block">
            {t("admin.trackOrderTitle")}
          </span>
          <p className="text-[10px] text-xdj-muted max-w-2xl mt-1">{t("admin.trackOrderHint")}</p>
        </div>
        {savingGenre ? (
          <span className="text-[10px] text-xdj-cyan font-lcd tracking-wider">{t("common.saving")}</span>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-xdj-orange px-1" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-track-order-browser flex-1 min-h-0">
        <TrackList
          genreTabs={genres}
          tracks={tracks.filter((t) => !t.isMissing)}
          genreTrackOrders={genreTrackOrders}
          reorderMode
          savingReorderGenre={savingGenre}
          onReorderTracks={handleReorderTracks}
          currentTrack={currentTrack}
          activeVersionIds={activeVersionIds}
          onSelectVersion={onSelectVersion}
          isPlaying={isPlaying}
          onTrackSelect={onTrackSelect}
          formatTime={formatTime}
          ratings={{}}
          comments={{}}
          onRateTrack={noop}
          onCommentChange={noop}
        />
      </div>
    </section>
  );
}
