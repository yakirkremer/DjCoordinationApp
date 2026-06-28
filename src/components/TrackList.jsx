import React, { useState, useEffect, useMemo } from "react";
import TrackCommentInput from "./TrackCommentInput";
import TrackFeedback from "./TrackFeedback";
import TrackRating from "./TrackRating";
import PreviewWaveform from "./PreviewWaveform";
import TrackArtwork from "./TrackArtwork";
import TrackVersionPicker from "./TrackVersionPicker";
import DropTypeBadge from "./DropTypeBadge";
import { getTrackComment, getTrackRating } from "../lib/trackRating";
import { getPreviewLength } from "../lib/previewCue";
import { applyActiveVersion, ensureTrackVersions } from "../lib/trackVersions";
import {
  countTracksForGenre,
  getTracksForGenre,
} from "../lib/genreCatalog";
import { sortTracksInGenre } from "../lib/genreTrackOrder";
import { useAppSettingsContext } from "../lib/i18n/AppSettingsContext";

const REORDER_DRAG_TYPE = "application/x-dj-track-reorder-id";

function resolveRowVersionId(track, entry, activeVersionIds) {
  if (entry?.lockVersion) return entry.versionId;
  const normalized = ensureTrackVersions(track);
  return (
    activeVersionIds[track.id] ??
    entry?.versionId ??
    normalized.defaultVersionId ??
    normalized.versions?.[0]?.id
  );
}

function FolderIcon({ open }) {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor" aria-hidden>
      {open ? (
        <path d="M1 2.5V10a1 1 0 001 1h10a1 1 0 001-1V4.5H6.5L5 2.5H1z" />
      ) : (
        <path d="M1 2.5A1 1 0 012 1.5h3l1.5 2H12a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V2.5z" />
      )}
    </svg>
  );
}

function HwButton({ label, active, variant = "orange", onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`xdj-hw-btn xdj-hw-btn-${variant} ${active ? "is-active" : ""} ${className}`}
    >
      {label}
    </button>
  );
}

function TransportIcon({ type }) {
  const icons = {
    play: "▶",
    pause: "❚❚",
    back: "⏮",
    fwd: "⏭",
  };
  return <span className="xdj-hw-transport-glyph">{icons[type]}</span>;
}

export default function TrackList({
  tracks,
  genreTabs = null,
  genreTrackOrders: genreTrackOrdersProp,
  reorderMode = false,
  savingReorderGenre = "",
  onReorderTracks,
  currentTrack,
  activeVersionIds = {},
  onSelectVersion,
  isPlaying,
  onTrackSelect,
  onPlayPause,
  formatTime,
  ratings,
  comments,
  onRateTrack,
  onCommentChange,
  inlinePlayer = null,
}) {
  const { settings } = useAppSettingsContext();
  const genreTrackOrders = genreTrackOrdersProp ?? settings.genreTrackOrders ?? {};
  const catalogMode = Array.isArray(genreTabs) && genreTabs.length > 0;
  const categoriesInTracks = catalogMode
    ? genreTabs
    : [...new Set(tracks.map((t) => t.bucket))];
  const [activeTab, setActiveTab] = useState(categoriesInTracks[0] || "");
  const [showPreview, setShowPreview] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true
  );
  const [useCardLayout, setUseCardLayout] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dragTrackId, setDragTrackId] = useState(null);
  const [dragOverTrackId, setDragOverTrackId] = useState(null);
  const categoriesKey = categoriesInTracks.join("|");

  useEffect(() => {
    if (!categoriesInTracks.includes(activeTab) && categoriesInTracks.length > 0) {
      setActiveTab(categoriesInTracks[0]);
    }
  }, [categoriesKey, activeTab, categoriesInTracks]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (event) => setUseCardLayout(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const genreEntries = useMemo(() => {
    if (!catalogMode || !activeTab) return [];
    return getTracksForGenre(tracks, activeTab, genreTrackOrders);
  }, [catalogMode, tracks, activeTab, genreTrackOrders]);

  const folderTracks = useMemo(() => {
    const inFolder = tracks.filter((t) => t.bucket === activeTab);
    return sortTracksInGenre(inFolder, activeTab, genreTrackOrders);
  }, [tracks, activeTab, genreTrackOrders]);
  const query = searchQuery.trim().toLowerCase();
  const filteredTracks = query
    ? (catalogMode ? genreEntries : folderTracks).filter((item) => {
        const track = catalogMode ? item.track : item;
        return (
          track.title?.toLowerCase().includes(query) ||
          track.artist?.toLowerCase().includes(query)
        );
      })
    : catalogMode
      ? genreEntries
      : folderTracks;

  const resolveRow = (item, index) => {
    if (catalogMode) {
      const entry = item;
      const track = entry.track;
      const versionId = resolveRowVersionId(track, entry, activeVersionIds);
      const playTrack = applyActiveVersion(ensureTrackVersions(track), versionId);
      const isSelected =
        currentTrack?.id === track.id &&
        (entry.lockVersion ? currentTrack?.activeVersionId === entry.versionId : true);
      return {
        entry,
        playTrack,
        track,
        versionId,
        isSelected,
        rowKey: entry.lockVersion ? `${track.id}-${entry.versionId}` : track.id,
        index,
      };
    }
    const track = item;
    const versionId = resolveRowVersionId(track, null, activeVersionIds);
    const playTrack = applyActiveVersion(ensureTrackVersions(track), versionId);
    const isSelected = currentTrack?.id === track.id;
    return { entry: null, playTrack, track, versionId, isSelected, rowKey: track.id, index };
  };

  const selectRow = (row) => {
    if (catalogMode && row.entry) {
      onTrackSelect(row.track, {
        versionId: row.versionId,
        lockVersion: row.entry.lockVersion,
      });
    } else {
      onTrackSelect(row.track, { versionId: row.versionId, lockVersion: false });
    }
  };

  const playPauseForTab = () => {
    if (!currentTrack) return;
    if (catalogMode && activeTab) {
      const entry = genreEntries.find((e) => e.track.id === currentTrack.id);
      if (entry) {
        const versionId = resolveRowVersionId(entry.track, entry, activeVersionIds);
        onTrackSelect(entry.track, {
          versionId,
          lockVersion: entry.lockVersion,
        });
        return;
      }
    }
    onTrackSelect(currentTrack, { lockVersion: false });
  };

  useEffect(() => {
    if (!catalogMode || !activeTab || !currentTrack?.id) return;
    const entry = genreEntries.find((e) => e.track.id === currentTrack.id);
    // Only force version when browsing a drop-mirror genre (Techno, House, etc.).
    if (!entry?.lockVersion) return;
    if (entry.versionId === currentTrack.activeVersionId) return;
    onTrackSelect(entry.track, {
      versionId: entry.versionId,
      lockVersion: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync locked version when genre tab changes
  }, [activeTab]);

  const currentIndex = catalogMode
    ? filteredTracks.findIndex((e) => {
        if (currentTrack?.id !== e.track.id) return false;
        if (e.lockVersion) return currentTrack?.activeVersionId === e.versionId;
        return true;
      })
    : filteredTracks.findIndex((t) => t.id === currentTrack?.id);

  const goPrev = () => {
    if (currentIndex > 0) selectRow(resolveRow(filteredTracks[currentIndex - 1], currentIndex - 1));
    else if (filteredTracks.length > 0) selectRow(resolveRow(filteredTracks[0], 0));
  };

  const goNext = () => {
    if (currentIndex >= 0 && currentIndex < filteredTracks.length - 1) {
      selectRow(resolveRow(filteredTracks[currentIndex + 1], currentIndex + 1));
    } else if (filteredTracks.length > 0) {
      selectRow(resolveRow(filteredTracks[0], 0));
    }
  };

  const canReorderRow = (entry) => reorderMode && (!catalogMode || !entry?.lockVersion);

  const handleReorderDragStart = (e, trackId, entry) => {
    if (!canReorderRow(entry)) return;
    e.dataTransfer.setData(REORDER_DRAG_TYPE, trackId);
    e.dataTransfer.effectAllowed = "move";
    setDragTrackId(trackId);
  };

  const handleReorderDragEnd = () => {
    setDragTrackId(null);
    setDragOverTrackId(null);
  };

  const handleReorderDragOver = (e, trackId, entry) => {
    if (!reorderMode || !canReorderRow(entry)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTrackId(trackId);
  };

  const handleReorderDrop = (e, targetTrackId, entry) => {
    e.preventDefault();
    if (!reorderMode || !canReorderRow(entry)) return;
    const draggedId = e.dataTransfer.getData(REORDER_DRAG_TYPE);
    setDragTrackId(null);
    setDragOverTrackId(null);
    if (!draggedId || draggedId === targetTrackId) return;
    onReorderTracks?.(activeTab, draggedId, targetTrackId);
  };

  const hasSelectedInList = filteredTracks.some((item, index) => resolveRow(item, index).isSelected);

  const renderInlinePlayer = (visible) =>
    visible && inlinePlayer ? (
      <div className="xdj-az-inline-player" onClick={(e) => e.stopPropagation()}>
        {inlinePlayer}
      </div>
    ) : null;

  const screenContent = (
    <div className={`xdj-az-browser xdj-az-browser-screen ${reorderMode ? "is-reorder-mode" : ""}`} dir="ltr">
      <div className="xdj-az-toolbar">
        <div className="xdj-az-toolbar-left">
          <div className="xdj-az-breadcrumb">
            <span className="xdj-az-crumb-root">kremer POOL</span>
            <span className="xdj-az-crumb-sep">›</span>
            <span className="xdj-az-crumb-active">{activeTab || "—"}</span>
          </div>
        </div>
        <div className="xdj-az-toolbar-right">
          {showSearch && (
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH..."
              className="xdj-az-search-input"
              autoFocus
            />
          )}
          <span className="xdj-az-track-count">{filteredTracks.length} TRACKS</span>
          {reorderMode ? (
            <span className="xdj-az-reorder-hint text-[9px] text-xdj-cyan font-lcd tracking-wider">
              {savingReorderGenre === activeTab ? "SAVING..." : "DRAG TO REORDER"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="xdj-az-body">
        <aside className="xdj-az-folders">
          <div className="xdj-az-folders-label">COLLECTION</div>
          <ul className="xdj-az-folder-list">
            {categoriesInTracks.map((category) => {
              const count = catalogMode
                ? countTracksForGenre(tracks, category)
                : tracks.filter((t) => t.bucket === category).length;
              const isActive = activeTab === category;
              return (
                <li key={category}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(category)}
                    className={`xdj-az-folder-item ${isActive ? "is-active" : ""}`}
                  >
                    <span className="xdj-az-folder-icon">
                      <FolderIcon open={isActive} />
                    </span>
                    <span className="xdj-az-folder-name">{category}</span>
                    <span className="xdj-az-folder-count">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="xdj-az-tracks">
          <div className="xdj-az-col-header">
            <div className="xdj-az-col xdj-az-col-no">#</div>
            <div className="xdj-az-col xdj-az-col-art">ART</div>
            {showPreview && <div className="xdj-az-col xdj-az-col-preview">PREVIEW</div>}
            <div className="xdj-az-col xdj-az-col-title">TRACK TITLE</div>
            <div className="xdj-az-col xdj-az-col-artist hidden md:block">ARTIST</div>
            <div className="xdj-az-col xdj-az-col-time hidden sm:block">TIME</div>
            {!reorderMode ? (
              <>
                <div className="xdj-az-col xdj-az-col-rate">RATE</div>
                <div className="xdj-az-col xdj-az-col-note hidden lg:block">NOTE</div>
              </>
            ) : (
              <div className="xdj-az-col xdj-az-col-grip">ORDER</div>
            )}
          </div>

          <div className="xdj-az-track-scroll">
            {filteredTracks.length === 0 ? (
              <p className="xdj-az-empty">NO TRACKS IN FOLDER</p>
            ) : (
              <>
                {renderInlinePlayer(inlinePlayer && currentTrack && !hasSelectedInList)}
                <div className="xdj-az-mobile-cards">
                  {filteredTracks.map((item, index) => {
                    const row = resolveRow(item, index);
                    const { track, playTrack, isSelected, rowKey, entry, versionId } = row;
                    const isThisPlaying =
                      isSelected && isPlaying && currentTrack?.activeVersionId === versionId;

                    return (
                      <React.Fragment key={rowKey}>
                      <div
                        className={`xdj-az-track-card ${
                          isThisPlaying ? "is-playing" : isSelected ? "is-cursor" : ""
                        }`}
                        onClick={() => selectRow(row)}
                      >
                        <div className="xdj-az-track-card-top">
                          <TrackArtwork track={track} />
                          <div className="xdj-az-track-card-meta">
                            <div className="xdj-az-track-card-title">{track.title}</div>
                            <div className="xdj-az-track-card-artist">{track.artist}</div>
                            {entry?.lockVersion ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] text-xdj-muted">{track.bucket}</span>
                                <DropTypeBadge drop={playTrack.drop} compact />
                              </div>
                            ) : (
                              <TrackVersionPicker
                                track={track}
                                activeVersionId={versionId}
                                onSelectVersion={onSelectVersion}
                                compact
                              />
                            )}
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <TrackRating
                              rating={getTrackRating(ratings, track.id, versionId)}
                              onRate={(value) => onRateTrack(track.id, value, versionId)}
                              compact
                              touchFriendly
                            />
                          </div>
                        </div>
                        {showPreview && (
                          <div
                            className="xdj-az-track-card-preview"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectRow(row);
                            }}
                          >
                            <PreviewWaveform
                              track={playTrack}
                              isActive={isSelected}
                              isPlaying={isThisPlaying}
                            />
                          </div>
                        )}
                        <TrackFeedback
                          rating={getTrackRating(ratings, track.id, versionId)}
                          comment={getTrackComment(comments, track.id, versionId)}
                          onRate={(value) => onRateTrack(track.id, value, versionId)}
                          onCommentChange={(text) => onCommentChange(track.id, text, versionId)}
                          mobile
                          hideRating
                        />
                      </div>
                      {renderInlinePlayer(isSelected && useCardLayout)}
                      </React.Fragment>
                    );
                  })}
                </div>

                {filteredTracks.map((item, index) => {
                const row = resolveRow(item, index);
                const { track, playTrack, isSelected, rowKey, entry, versionId } = row;
                const isThisPlaying =
                  isSelected && isPlaying && currentTrack?.activeVersionId === versionId;

                return (
                  <React.Fragment key={rowKey}>
                  <div
                    className={`xdj-az-row ${isThisPlaying ? "is-playing" : isSelected ? "is-cursor" : ""} ${
                      dragOverTrackId === track.id ? "is-drag-over" : ""
                    } ${dragTrackId === track.id ? "is-dragging" : ""} ${
                      canReorderRow(entry) ? "is-reorderable" : ""
                    }`}
                    draggable={canReorderRow(entry)}
                    onDragStart={(e) => handleReorderDragStart(e, track.id, entry)}
                    onDragEnd={handleReorderDragEnd}
                    onDragOver={(e) => handleReorderDragOver(e, track.id, entry)}
                    onDragLeave={() => setDragOverTrackId((id) => (id === track.id ? null : id))}
                    onDrop={(e) => handleReorderDrop(e, track.id, entry)}
                    onClick={() => selectRow(row)}
                  >
                    <div className="xdj-az-col xdj-az-col-no">
                      <span className="xdj-az-row-no">{String(index + 1).padStart(2, "0")}</span>
                      {isThisPlaying && <span className="xdj-az-play-indicator" />}
                    </div>

                    <div className="xdj-az-col xdj-az-col-art">
                      <TrackArtwork track={track} />
                    </div>

                    {showPreview && (
                      <div
                        className="xdj-az-col xdj-az-col-preview"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectRow(row);
                        }}
                      >
                        <PreviewWaveform
                          track={playTrack}
                          isActive={isSelected}
                          isPlaying={isThisPlaying}
                        />
                      </div>
                    )}

                    <div className="xdj-az-col xdj-az-col-title">
                      <span className="xdj-az-track-title">{track.title}</span>
                      {entry?.lockVersion ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] text-xdj-muted">{track.bucket}</span>
                          <DropTypeBadge drop={playTrack.drop} compact />
                        </div>
                      ) : (
                        <TrackVersionPicker
                          track={track}
                          activeVersionId={versionId}
                          onSelectVersion={onSelectVersion}
                          compact
                          className="mt-0.5"
                        />
                      )}
                    </div>

                    <div className="xdj-az-col xdj-az-col-artist hidden md:block">
                      <span className="xdj-az-track-artist">{track.artist}</span>
                    </div>

                    <div className="xdj-az-col xdj-az-col-time hidden sm:block">
                      <span className="xdj-az-track-time">
                        {formatTime(getPreviewLength(playTrack))}
                      </span>
                    </div>

                    {!reorderMode ? (
                      <>
                        <div className="xdj-az-col xdj-az-col-rate" onClick={(e) => e.stopPropagation()}>
                          <TrackFeedback
                            rating={getTrackRating(ratings, track.id, versionId)}
                            comment={getTrackComment(comments, track.id, versionId)}
                            onRate={(value) => onRateTrack(track.id, value, versionId)}
                            onCommentChange={(text) => onCommentChange(track.id, text, versionId)}
                            compact
                          />
                        </div>

                        <div
                          className="xdj-az-col xdj-az-col-note hidden lg:block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TrackCommentInput
                            value={getTrackComment(comments, track.id, versionId)}
                            onChange={(text) => onCommentChange(track.id, text, versionId)}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="xdj-az-col xdj-az-col-grip">
                        {canReorderRow(entry) ? (
                          <span className="xdj-az-reorder-handle" title="Drag to reorder" aria-hidden>
                            ⋮⋮
                          </span>
                        ) : (
                          <span className="text-[9px] text-xdj-muted">—</span>
                        )}
                      </div>
                    )}
                  </div>
                  {renderInlinePlayer(isSelected && !useCardLayout)}
                  </React.Fragment>
                );
              })}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="xdj-az-mobile-folders">
        {categoriesInTracks.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveTab(category)}
            className={`xdj-az-mobile-folder ${activeTab === category ? "is-active" : ""}`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="xdj-hw-unit" dir="ltr">
      <div className="xdj-hw-mobile-bar">
        <HwButton label="PLAYLIST" active={!showSearch} onClick={() => setShowSearch(false)} className="xdj-hw-btn-compact" />
        <HwButton label="SEARCH" active={showSearch} onClick={() => setShowSearch((v) => !v)} className="xdj-hw-btn-compact" />
        <HwButton label="VIEW" variant="blue" active={showPreview} onClick={() => setShowPreview((v) => !v)} className="xdj-hw-btn-compact" />
      </div>
      <div className="xdj-hw-faceplate">
        <div className="xdj-hw-main-row">
          <div className="xdj-hw-side xdj-hw-side-left">
            <HwButton label="PLAYLIST" active={!showSearch} onClick={() => setShowSearch(false)} />
            <HwButton
              label="SEARCH"
              active={showSearch}
              onClick={() => setShowSearch((v) => !v)}
            />
            <HwButton
              label="VIEW"
              variant="blue"
              active={showPreview}
              onClick={() => setShowPreview((v) => !v)}
            />
          </div>

          <div className="xdj-hw-screen">
            <div className="xdj-hw-screen-glass">{screenContent}</div>
          </div>
        </div>

        <div className="xdj-hw-bottom-row">
          <div className="xdj-hw-transport-cluster">
            <button type="button" className="xdj-hw-transport-key" onClick={goPrev} aria-label="Previous track">
              <TransportIcon type="back" />
            </button>
            <button
              type="button"
              className="xdj-hw-transport-key xdj-hw-transport-key-lg"
              onClick={onPlayPause ?? playPauseForTab}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <TransportIcon type={isPlaying ? "pause" : "play"} />
            </button>
            <button type="button" className="xdj-hw-transport-key" onClick={goNext} aria-label="Next track">
              <TransportIcon type="fwd" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
