import React, { useMemo, useState } from "react";
import { useGenres } from "../hooks/useGenres";
import { normGenreKey } from "../lib/genreCatalog";
import { getGenreAccent } from "../lib/genreColors";
import { ensureTrackVersions } from "../lib/trackVersions";
import { useI18n } from "../lib/i18n/AppSettingsContext";
import { updateTrack } from "../lib/api/uploadTrack";

const DRAG_TYPE = "application/x-dj-track-id";

function groupTracksByGenre(tracks, columns) {
  const groups = Object.fromEntries(columns.map((genre) => [genre, []]));

  for (const raw of tracks) {
    const track = ensureTrackVersions(raw);
    const bucket = track.bucket || "";
    const column =
      columns.find((genre) => normGenreKey(genre) === normGenreKey(bucket)) || columns[0];
    if (!column) continue;
    groups[column].push(track);
  }

  for (const genre of columns) {
    groups[genre].sort((a, b) => (a.title || "").localeCompare(b.title || "", "he"));
  }

  return groups;
}

export default function AdminGenreOrganizer({ tracks, onTrackSaved, onPreviewTrack }) {
  const { t, dir } = useI18n();
  const genres = useGenres();
  const [dragOverGenre, setDragOverGenre] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [movingId, setMovingId] = useState(null);
  const [error, setError] = useState("");

  const columns = useMemo(() => {
    const list = [...genres];
    for (const track of tracks) {
      const bucket = track.bucket || "";
      if (!bucket) continue;
      if (!list.some((genre) => normGenreKey(genre) === normGenreKey(bucket))) {
        list.push(bucket);
      }
    }
    return list;
  }, [genres, tracks]);

  const grouped = useMemo(() => groupTracksByGenre(tracks, columns), [tracks, columns]);

  const handleDragStart = (e, trackId) => {
    e.dataTransfer.setData(DRAG_TYPE, trackId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(trackId);
    setError("");
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverGenre(null);
  };

  const handleDragOver = (e, genre) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverGenre(genre);
  };

  const handleDragLeave = (genre) => {
    setDragOverGenre((prev) => (prev === genre ? null : prev));
  };

  const handleDrop = async (e, targetGenre) => {
    e.preventDefault();
    setDragOverGenre(null);
    setDraggingId(null);

    const trackId = e.dataTransfer.getData(DRAG_TYPE);
    if (!trackId) return;

    const track = tracks.find((tr) => tr.id === trackId);
    if (!track) return;
    if (normGenreKey(track.bucket) === normGenreKey(targetGenre)) return;

    setMovingId(trackId);
    setError("");
    try {
      const saved = await updateTrack(trackId, { bucket: targetGenre });
      onTrackSaved?.(saved);
    } catch (err) {
      setError(err.message || t("admin.organizeMoveFailed"));
    } finally {
      setMovingId(null);
    }
  };

  return (
    <section className="admin-genre-organizer flex flex-col gap-4 min-h-0 flex-1" dir={dir}>
      <div className="xdj-browser-header flex flex-wrap items-center justify-between gap-2">
        <span className="font-lcd text-xs tracking-[0.25em] text-xdj-cyan">{t("admin.organizeTitle")}</span>
        <p className="text-[10px] text-xdj-muted max-w-xl">{t("admin.organizeHint")}</p>
      </div>

      {error ? (
        <p className="text-xs text-xdj-orange px-1" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-genre-board flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-2">
        <div className="admin-genre-board-inner flex gap-3 min-h-[min(70vh,640px)] h-full">
          {columns.map((genre) => {
            const accent = getGenreAccent(genre);
            const items = grouped[genre] || [];
            const isOver = dragOverGenre === genre;

            return (
              <div
                key={genre}
                className={`admin-genre-column ${isOver ? "is-drag-over" : ""}`}
                style={{ "--genre-accent": accent }}
                onDragOver={(e) => handleDragOver(e, genre)}
                onDragLeave={() => handleDragLeave(genre)}
                onDrop={(e) => handleDrop(e, genre)}
              >
                <header className="admin-genre-column-header">
                  <h3 className="admin-genre-column-title">{genre}</h3>
                  <span className="admin-genre-column-count">{items.length}</span>
                </header>

                <ul className="admin-genre-column-list">
                  {items.length === 0 ? (
                    <li className="admin-genre-column-empty">{t("admin.organizeEmpty")}</li>
                  ) : (
                    items.map((track) => {
                      const normalized = ensureTrackVersions(track);
                      const versionCount = normalized.versions?.length ?? 1;
                      const isDragging = draggingId === track.id;
                      const isMoving = movingId === track.id;

                      return (
                        <li key={track.id}>
                          <div
                            draggable={!isMoving}
                            onDragStart={(e) => handleDragStart(e, track.id)}
                            onDragEnd={handleDragEnd}
                            className={`admin-genre-track-card ${isDragging ? "is-dragging" : ""} ${
                              isMoving ? "is-moving" : ""
                            } ${track.isMissing ? "is-missing" : ""}`}
                          >
                            <button
                              type="button"
                              className="admin-genre-track-play"
                              disabled={track.isMissing}
                              onClick={() => onPreviewTrack?.(track, { play: true })}
                              aria-label={t("admin.colPreview")}
                            >
                              ▶
                            </button>
                            <div className="admin-genre-track-meta min-w-0">
                              <p className="admin-genre-track-title truncate">{track.title}</p>
                              <p className="admin-genre-track-artist truncate">{track.artist}</p>
                              <p className="admin-genre-track-meta-extra">
                                {versionCount > 1
                                  ? t("admin.versionsCount", { count: versionCount })
                                  : null}
                                {isMoving ? ` · ${t("common.saving")}` : null}
                              </p>
                            </div>
                            <span className="admin-genre-drag-handle" aria-hidden>
                              ⋮⋮
                            </span>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
