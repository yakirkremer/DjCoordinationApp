import React, { useState, useEffect } from "react";
import TrackCommentInput from "./TrackCommentInput";
import TrackFeedback from "./TrackFeedback";
import PreviewWaveform from "./PreviewWaveform";
import TrackArtwork from "./TrackArtwork";
import StarRating from "./StarRating";
import { getPreviewLength } from "../lib/previewCue";

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
  currentTrack,
  isPlaying,
  onTrackSelect,
  onPlayPause,
  formatTime,
  ratings,
  comments,
  onRateTrack,
  onCommentChange,
}) {
  const categoriesInTracks = [...new Set(tracks.map((t) => t.bucket))];
  const [activeTab, setActiveTab] = useState(categoriesInTracks[0] || "");
  const [showPreview, setShowPreview] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true
  );
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const categoriesKey = categoriesInTracks.join("|");

  useEffect(() => {
    if (!categoriesInTracks.includes(activeTab) && categoriesInTracks.length > 0) {
      setActiveTab(categoriesInTracks[0]);
    }
  }, [categoriesKey, activeTab, categoriesInTracks]);

  const folderTracks = tracks.filter((t) => t.bucket === activeTab && t.isMissing !== true);
  const query = searchQuery.trim().toLowerCase();
  const filteredTracks = query
    ? folderTracks.filter(
        (t) =>
          t.title?.toLowerCase().includes(query) || t.artist?.toLowerCase().includes(query)
      )
    : folderTracks;

  const currentIndex = filteredTracks.findIndex((t) => t.id === currentTrack?.id);

  const goPrev = () => {
    if (currentIndex > 0) onTrackSelect(filteredTracks[currentIndex - 1]);
    else if (filteredTracks.length > 0) onTrackSelect(filteredTracks[0]);
  };

  const goNext = () => {
    if (currentIndex >= 0 && currentIndex < filteredTracks.length - 1) {
      onTrackSelect(filteredTracks[currentIndex + 1]);
    } else if (filteredTracks.length > 0) {
      onTrackSelect(filteredTracks[0]);
    }
  };

  const screenContent = (
    <div className="xdj-az-browser xdj-az-browser-screen" dir="ltr">
      <div className="xdj-az-toolbar">
        <div className="xdj-az-toolbar-left">
          <div className="xdj-az-breadcrumb">
            <span className="xdj-az-crumb-root">KRAMER POOL</span>
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
        </div>
      </div>

      <div className="xdj-az-body">
        <aside className="xdj-az-folders">
          <div className="xdj-az-folders-label">COLLECTION</div>
          <ul className="xdj-az-folder-list">
            {categoriesInTracks.map((category) => {
              const count = tracks.filter((t) => t.bucket === category).length;
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
            <div className="xdj-az-col xdj-az-col-rate">RATE</div>
            <div className="xdj-az-col xdj-az-col-note hidden lg:block">NOTE</div>
          </div>

          <div className="xdj-az-track-scroll">
            {filteredTracks.length === 0 ? (
              <p className="xdj-az-empty">NO TRACKS IN FOLDER</p>
            ) : (
              <>
                <div className="xdj-az-mobile-cards">
                  {filteredTracks.map((track) => {
                    const isSelected = currentTrack?.id === track.id;
                    const isThisPlaying = isSelected && isPlaying;

                    return (
                      <div
                        key={track.id}
                        className={`xdj-az-track-card ${
                          isThisPlaying ? "is-playing" : isSelected ? "is-cursor" : ""
                        }`}
                        onClick={() => onTrackSelect(track)}
                      >
                        <div className="xdj-az-track-card-top">
                          <TrackArtwork track={track} />
                          <div className="xdj-az-track-card-meta">
                            <div className="xdj-az-track-card-title">{track.title}</div>
                            <div className="xdj-az-track-card-artist">{track.artist}</div>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <StarRating
                              rating={ratings[track.id] || 0}
                              onRate={(star) => onRateTrack(track.id, star)}
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
                              onTrackSelect(track);
                            }}
                          >
                            <PreviewWaveform
                              track={track}
                              isActive={isSelected}
                              isPlaying={isThisPlaying}
                            />
                          </div>
                        )}
                        <TrackFeedback
                          rating={ratings[track.id] || 0}
                          comment={comments[track.id] || ""}
                          onRate={(star) => onRateTrack(track.id, star)}
                          onCommentChange={(text) => onCommentChange(track.id, text)}
                          mobile
                          hideStars
                        />
                      </div>
                    );
                  })}
                </div>

                {filteredTracks.map((track, index) => {
                const isSelected = currentTrack?.id === track.id;
                const isThisPlaying = isSelected && isPlaying;

                return (
                  <div
                    key={track.id}
                    className={`xdj-az-row ${isThisPlaying ? "is-playing" : isSelected ? "is-cursor" : ""}`}
                    onClick={() => onTrackSelect(track)}
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
                          onTrackSelect(track);
                        }}
                      >
                        <PreviewWaveform
                          track={track}
                          isActive={isSelected}
                          isPlaying={isThisPlaying}
                        />
                      </div>
                    )}

                    <div className="xdj-az-col xdj-az-col-title">
                      <span className="xdj-az-track-title">{track.title}</span>
                    </div>

                    <div className="xdj-az-col xdj-az-col-artist hidden md:block">
                      <span className="xdj-az-track-artist">{track.artist}</span>
                    </div>

                    <div className="xdj-az-col xdj-az-col-time hidden sm:block">
                      <span className="xdj-az-track-time">
                        {formatTime(getPreviewLength(track))}
                      </span>
                    </div>

                    <div className="xdj-az-col xdj-az-col-rate" onClick={(e) => e.stopPropagation()}>
                      <TrackFeedback
                        rating={ratings[track.id] || 0}
                        comment={comments[track.id] || ""}
                        onRate={(star) => onRateTrack(track.id, star)}
                        onCommentChange={(text) => onCommentChange(track.id, text)}
                        compact
                      />
                    </div>

                    <div
                      className="xdj-az-col xdj-az-col-note hidden lg:block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TrackCommentInput
                        value={comments[track.id] || ""}
                        onChange={(text) => onCommentChange(track.id, text)}
                      />
                    </div>
                  </div>
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
              onClick={onPlayPause}
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
