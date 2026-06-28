import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import TrackArtwork from "./TrackArtwork";
import TrackReloadButton from "./TrackReloadButton";
import TrackVersionPicker from "./TrackVersionPicker";
import DropTypeBadge from "./DropTypeBadge";
import { normalizePreviewCue, isWithinPreviewCue, MIN_PREVIEW_LENGTH, computeLinkedCue } from "../lib/previewCue";
import { getTrackSourceSummary } from "../lib/trackSource";
import { getWaveSurferOptions } from "../lib/waveformStyles";
import { getDropPlayerCssVars, getDropWaveformColors } from "../lib/dropTypeColors";
import { useDropColors } from "../hooks/useDropColors";
import { useAppSettingsContext } from "../lib/i18n/AppSettingsContext";

const PLAYER_EXPAND_KEY = "kramer-player-expanded";
const LINK_CUES_KEY = "kramer-link-cues-v1";

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export default function GlobalPlayer({
  currentTrack,
  catalogTrack,
  activeVersionId,
  versionLocked = false,
  onSelectVersion,
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
  formatTime,
  onUpdateTrack,
  onUpdateTrackCue,
  isAdmin = false,
  resolveTrackUrl,
  embedded = false,
  onTrackReloaded,
  onPlaybackFailed,
}) {
  const { activeWaveformStyle, activeTheme } = useAppSettingsContext();
  const { colorMap } = useDropColors();
  const waveformRef = useRef(null);
  const waveCanvasRef = useRef(null);
  const wavesurferRef = useRef(null);
  const draggingRef = useRef(null);
  const cueRef = useRef({ startTime: 0, endTime: 60 });
  const durationRef = useRef(0);
  const linkSpanRef = useRef(60);
  const linkCuesRef = useRef(false);
  const [linkCues, setLinkCues] = useState(() => {
    try {
      return sessionStorage.getItem(LINK_CUES_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [duration, setDuration] = useState(0);
  const [showElapsed, setShowElapsed] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [expanded, setExpanded] = useState(() => {
    try {
      return sessionStorage.getItem(PLAYER_EXPAND_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(PLAYER_EXPAND_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const useMiniPlayer = isMobile && !isAdmin;
  const isCollapsed = useMiniPlayer && !expanded;

  const cue = useMemo(() => normalizePreviewCue(currentTrack), [currentTrack]);
  const trackSource = useMemo(
    () => (currentTrack ? getTrackSourceSummary(currentTrack) : null),
    [currentTrack]
  );

  useEffect(() => {
    linkCuesRef.current = linkCues;
    try {
      sessionStorage.setItem(LINK_CUES_KEY, linkCues ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [linkCues]);

  useEffect(() => {
    if (!draggingRef.current) {
      cueRef.current = { startTime: cue.startTime, endTime: cue.endTime };
    }
  }, [cue.startTime, cue.endTime]);

  const previewLength = cue.endTime - cue.startTime;
  const progressInCue = Math.max(0, Math.min(currentTime - cue.startTime, previewLength));
  const remainInCue = Math.max(0, previewLength - progressInCue);
  const displayTime = showElapsed ? progressInCue : remainInCue;

  const cueInPct = duration > 0 ? (cue.startTime / duration) * 100 : 0;
  const cueOutPct = duration > 0 ? (cue.endTime / duration) * 100 : 100;
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const activeDrop = currentTrack?.drop?.trim() || "";
  const dropPlayerStyle = useMemo(
    () => (activeDrop ? getDropPlayerCssVars(activeDrop, colorMap) : {}),
    [activeDrop, colorMap]
  );
  const dropWaveColors = useMemo(
    () => (activeDrop ? getDropWaveformColors(activeDrop, colorMap) : null),
    [activeDrop, colorMap]
  );

  const seekToCueIn = useCallback(
    (ws) => {
      if (!ws) return;
      const dur = ws.getDuration();
      if (!dur) return;
      const start = Math.min(cue.startTime, Math.max(0, dur - 1));
      ws.setTime(start);
      setCurrentTime(start);
    },
    [cue.startTime, setCurrentTime]
  );

  const timeFromClientX = useCallback(
    (clientX) => {
      const rect = waveCanvasRef.current?.getBoundingClientRect();
      if (!rect || duration <= 0) return 0;
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(pct * duration);
    },
    [duration]
  );

  const applyCuePair = useCallback(
    (next) => {
      if (!currentTrack || !next) return;
      cueRef.current = next;
      if (onUpdateTrackCue) {
        onUpdateTrackCue(currentTrack.id, next);
      } else {
        onUpdateTrack(currentTrack.id, "startTime", next.startTime);
        onUpdateTrack(currentTrack.id, "endTime", next.endTime);
      }
    },
    [currentTrack, onUpdateTrack, onUpdateTrackCue]
  );

  const applyCueDrag = useCallback(
    (which, time) => {
      if (!currentTrack) return;
      const dur = durationRef.current;
      if (dur <= 0) return;

      if (linkCuesRef.current) {
        const next = computeLinkedCue(which, time, linkSpanRef.current, dur);
        if (next) applyCuePair(next);
        return;
      }

      const { startTime, endTime } = cueRef.current;
      const maxStart = Math.max(0, endTime - MIN_PREVIEW_LENGTH);
      const minEnd = Math.min(dur, startTime + MIN_PREVIEW_LENGTH);

      if (which === "start") {
        const nextStart = Math.max(0, Math.min(time, maxStart));
        cueRef.current = { ...cueRef.current, startTime: nextStart };
        onUpdateTrack(currentTrack.id, "startTime", nextStart);
      } else {
        const nextEnd = Math.max(minEnd, Math.min(time, dur));
        cueRef.current = { ...cueRef.current, endTime: nextEnd };
        onUpdateTrack(currentTrack.id, "endTime", nextEnd);
      }
    },
    [applyCuePair, currentTrack, onUpdateTrack]
  );

  const startDrag = useCallback(
    (which) => (e) => {
      if (!isAdmin) return;
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = which;
      linkSpanRef.current = Math.max(
        MIN_PREVIEW_LENGTH,
        cueRef.current.endTime - cueRef.current.startTime
      );

      const onMove = (ev) => applyCueDrag(which, timeFromClientX(ev.clientX));
      const onUp = () => {
        draggingRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [applyCueDrag, isAdmin, timeFromClientX]
  );

  const setCueFromPlayhead = useCallback(
    (which) => {
      if (!currentTrack || duration <= 0) return;
      const t = Math.round(wavesurferRef.current?.getCurrentTime() ?? currentTime);
      applyCueDrag(which, t);
    },
    [applyCueDrag, currentTime, currentTrack, duration]
  );

  useEffect(() => {
    if (!currentTrack || !waveformRef.current) return;

    let cancelled = false;

    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.unAll();
        wavesurferRef.current.pause();
        wavesurferRef.current.destroy();
      } catch (e) {
        console.log("Error destroying previous wavesurfer instance:", e);
      }
      wavesurferRef.current = null;
    }

    setDuration(0);
    setLoadError(null);

    async function initPlayer() {
      let audioUrl;
      try {
        audioUrl = resolveTrackUrl
          ? await resolveTrackUrl(currentTrack)
          : `/music/${currentTrack.bucket}/analyzed/${encodeURIComponent(currentTrack.filename)}`;
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || "Failed to load audio");
        }
        return;
      }

      if (cancelled || !waveformRef.current) return;

      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        ...getWaveSurferOptions(activeWaveformStyle, 88, dropWaveColors),
      });

      wavesurferRef.current.on("ready", () => {
        if (cancelled) return;
        const dur = wavesurferRef.current.getDuration();
        setDuration(dur);
        durationRef.current = dur;
        if (!currentTrack.duration || currentTrack.duration !== Math.floor(dur)) {
          onUpdateTrack(currentTrack.id, "duration", Math.floor(dur));
        }
        seekToCueIn(wavesurferRef.current);

        if (isPlaying) {
          wavesurferRef.current.play().catch((err) => console.log("Playback blocked:", err));
        }
      });

      wavesurferRef.current.on("error", () => {
        if (!cancelled) {
          setLoadError("Playback error — file may be missing or corrupt.");
          onPlaybackFailed?.(currentTrack.id);
        }
      });

      wavesurferRef.current.on("timeupdate", (time) => {
        setCurrentTime(time);
        if (!isAdmin && time >= cue.endTime) {
          wavesurferRef.current.pause();
          setIsPlaying(false);
          seekToCueIn(wavesurferRef.current);
        }
      });

      wavesurferRef.current.on("interaction", () => {
        const time = wavesurferRef.current.getCurrentTime();
        setCurrentTime(time);
        if (isAdmin) return;
        if (time < cue.startTime) {
          seekToCueIn(wavesurferRef.current);
        } else if (time >= cue.endTime) {
          wavesurferRef.current.setTime(cue.endTime);
          wavesurferRef.current.pause();
          setIsPlaying(false);
          setCurrentTime(cue.endTime);
        }
      });

      wavesurferRef.current.load(audioUrl);
    }

    initPlayer();

    return () => {
      cancelled = true;
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.unAll();
          wavesurferRef.current.pause();
          wavesurferRef.current.destroy();
        } catch (e) {
          console.log("Cleanup error:", e);
        }
      }
    };
  }, [
    currentTrack?.id,
    currentTrack?.activeVersionId,
    currentTrack?.drop,
    currentTrack?.filename,
    currentTrack?.audioVersion,
    resolveTrackUrl,
    activeWaveformStyle,
    activeTheme,
    dropWaveColors,
  ]);

  useEffect(() => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      if (!isAdmin && !isWithinPreviewCue(cue, wavesurferRef.current.getCurrentTime())) {
        seekToCueIn(wavesurferRef.current);
      }
      wavesurferRef.current.play().catch(() => setIsPlaying(false));
    } else {
      wavesurferRef.current.pause();
    }
  }, [isPlaying, isAdmin, cue.startTime, cue.endTime, seekToCueIn, setIsPlaying]);

  const progressPct = previewLength > 0 ? (progressInCue / previewLength) * 100 : 0;

  return (
    <div
      className={`xdj-az-player shrink-0 ${isPlaying ? "is-playing" : ""} ${embedded ? "is-embedded" : ""} ${
        useMiniPlayer ? (expanded ? "is-expanded" : "is-collapsed") : ""
      } ${activeDrop ? "has-drop-theme" : ""}`}
      style={dropPlayerStyle}
      dir="ltr"
    >
      {useMiniPlayer && (
        <div className="xdj-az-player-mini">
          <div className="xdj-az-player-mini-row">
            <div className="xdj-az-player-mini-art">
              <TrackArtwork track={currentTrack} />
            </div>
            <div className="xdj-az-player-mini-meta">
              <h4 className="xdj-az-player-mini-title">{currentTrack.title}</h4>
              <p className="xdj-az-player-mini-artist">{currentTrack.artist}</p>
              {catalogTrack && onSelectVersion && !versionLocked ? (
                <TrackVersionPicker
                  track={catalogTrack}
                  activeVersionId={activeVersionId}
                  onSelectVersion={onSelectVersion}
                  compact
                  className="mt-0.5"
                />
              ) : versionLocked && currentTrack?.drop ? (
                <DropTypeBadge drop={currentTrack.drop} compact className="mt-0.5" />
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="xdj-az-player-mini-btn"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <span className="xdj-az-pause-bars">
                  <span />
                  <span />
                </span>
              ) : (
                <span className="xdj-az-play-tri" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleExpanded}
              className="xdj-az-player-mini-expand"
              aria-label={expanded ? "Collapse player" : "Expand player"}
            >
              {expanded ? "▼" : "▲"}
            </button>
          </div>
          <div className="xdj-az-player-mini-progress">
            <div
              className="xdj-az-player-mini-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="xdj-az-player-deck-bar">
        <div className="xdj-az-player-deck-left">
          <span className="xdj-az-deck-badge">1</span>
          <div className="xdj-az-player-track-meta">
            <h4 className="xdj-az-player-title">{currentTrack.title}</h4>
            <p className="xdj-az-player-artist">{currentTrack.artist}</p>
            {catalogTrack && onSelectVersion && !versionLocked ? (
              <TrackVersionPicker
                track={catalogTrack}
                activeVersionId={activeVersionId}
                onSelectVersion={onSelectVersion}
                className="mt-1"
              />
            ) : versionLocked && currentTrack?.drop ? (
              <DropTypeBadge drop={currentTrack.drop} className="mt-1" />
            ) : null}
          </div>
        </div>
        <div className="xdj-az-player-deck-center">
          <span className="xdj-az-player-tag">{currentTrack.bucket}</span>
          <span className="xdj-az-player-tag xdj-az-player-tag-dim">
            {isAdmin ? "ADMIN CUE EDIT" : "PREVIEW CUE"}
          </span>
          {isAdmin && trackSource ? (
            <span
              className={`xdj-az-player-tag text-[9px] max-w-[min(100%,280px)] truncate ${
                trackSource.status === "missing" ? "text-red-400" : "text-xdj-muted"
              }`}
              title={[trackSource.playbackUrl, trackSource.diskPath].filter(Boolean).join(" · ")}
            >
              {trackSource.status === "missing" ? "⚠ חסר: " : "▶ "}
              {trackSource.playbackUrl}
            </span>
          ) : null}
        </div>
        <div className="xdj-az-player-deck-right">
          {isAdmin && onTrackReloaded && currentTrack && (loadError || currentTrack.isMissing) ? (
            <TrackReloadButton
              track={currentTrack}
              versionId={activeVersionId || currentTrack.activeVersionId}
              onReloaded={(updated) => {
                setLoadError(null);
                onTrackReloaded(updated);
              }}
              compact
              label="טען קובץ"
            />
          ) : loadError ? (
            <span className="text-xs text-xdj-orange" title={loadError}>
              STREAM ERR
            </span>
          ) : (
            <span className={`xdj-az-player-status ${isPlaying ? "is-live" : ""}`}>
              {isPlaying ? "PLAY" : "PAUSE"}
            </span>
          )}
        </div>
      </div>

      <div className="xdj-az-player-body">
        <div className="xdj-az-jog-wrap">
          <div className={`xdj-az-jog ${isPlaying ? "is-spinning" : ""}`}>
            <div className="xdj-az-jog-inner">
              <TrackArtwork track={currentTrack} />
            </div>
          </div>
          <span className="xdj-az-jog-label">DECK 1</span>
        </div>

        <div className="xdj-az-wave-panel">
          <div className="xdj-az-wave-enlarged">
            <div className="xdj-az-cue-markers-top">
              {duration > 0 && (
                <>
                  <span
                    className={`xdj-az-cue-flag xdj-az-cue-in ${isAdmin ? "is-draggable" : ""}`}
                    style={{ left: `${cueInPct}%` }}
                    onPointerDown={isAdmin ? startDrag("start") : undefined}
                    title={isAdmin ? "גרור CUE IN (A)" : undefined}
                  >
                    A
                  </span>
                  <span
                    className={`xdj-az-cue-flag xdj-az-cue-out ${isAdmin ? "is-draggable" : ""}`}
                    style={{ left: `${cueOutPct}%` }}
                    onPointerDown={isAdmin ? startDrag("end") : undefined}
                    title={isAdmin ? "גרור CUE OUT (B)" : undefined}
                  >
                    B
                  </span>
                </>
              )}
            </div>
            <div className="xdj-az-wave-canvas" ref={waveCanvasRef}>
              <div ref={waveformRef} className="xdj-az-waveform-host w-full" />
              {duration > 0 && (
                <>
                  <div
                    className="xdj-az-cue-region"
                    style={{ left: `${cueInPct}%`, width: `${cueOutPct - cueInPct}%` }}
                  />
                  {isAdmin && (
                    <div className="xdj-az-cue-overlay" aria-hidden>
                      <div
                        className="xdj-az-cue-handle xdj-az-cue-handle-in"
                        style={{ left: `${cueInPct}%` }}
                        onPointerDown={startDrag("start")}
                        title="גרור CUE IN"
                      />
                      <div
                        className="xdj-az-cue-handle xdj-az-cue-handle-out"
                        style={{ left: `${cueOutPct}%` }}
                        onPointerDown={startDrag("end")}
                        title="גרור CUE OUT"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="xdj-az-cue-markers-bottom">
              {duration > 0 && (
                <>
                  <span className="xdj-az-cue-line" style={{ left: `${cueInPct}%` }} />
                  <span className="xdj-az-cue-line xdj-az-cue-line-out" style={{ left: `${cueOutPct}%` }} />
                </>
              )}
            </div>
          </div>

          <div className="xdj-az-wave-overview">
            <div className={`xdj-az-overview-track ${isAdmin ? "is-editable" : ""}`}>
              <div className="xdj-az-overview-played" style={{ width: `${playheadPct}%` }} />
              <div className="xdj-az-overview-playhead" style={{ left: `${playheadPct}%` }} />
              {duration > 0 && (
                <>
                  <div
                    className="xdj-az-overview-cue"
                    style={{ left: `${cueInPct}%`, width: `${cueOutPct - cueInPct}%` }}
                  />
                  {isAdmin && (
                    <>
                      <div
                        className="xdj-az-overview-cue-handle xdj-az-overview-cue-handle-in"
                        style={{ left: `${cueInPct}%` }}
                        onPointerDown={startDrag("start")}
                      />
                      <div
                        className="xdj-az-overview-cue-handle xdj-az-overview-cue-handle-out"
                        style={{ left: `${cueOutPct}%` }}
                        onPointerDown={startDrag("end")}
                      />
                    </>
                  )}
                </>
              )}
            </div>
            <div className="xdj-az-overview-labels">
              <span>0:00</span>
              <span>{duration > 0 ? formatTime(duration) : "—"}</span>
            </div>
          </div>
        </div>

        <div className="xdj-az-transport-panel">
          <button
            type="button"
            onClick={() => setShowElapsed((v) => !v)}
            className="xdj-az-time-display"
            title="Toggle elapsed / remaining"
          >
            <span className={`xdj-az-time-label ${showElapsed ? "is-active" : ""}`}>TIME</span>
            <span className={`xdj-az-time-label ${!showElapsed ? "is-active" : ""}`}>REMAIN</span>
            <span className="xdj-az-time-value">{formatTime(displayTime)}</span>
            <span className="xdj-az-time-ms">
              .{String(Math.floor((currentTime % 1) * 100)).padStart(2, "0")}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`xdj-az-transport-btn ${isPlaying ? "is-playing" : ""}`}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isAdmin ? "נגן / השהה (מלא)" : undefined}
          >
            {isPlaying ? (
              <span className="xdj-az-pause-bars">
                <span />
                <span />
              </span>
            ) : (
              <span className="xdj-az-play-tri" />
            )}
          </button>

          <div className="xdj-az-bpm-block">
            <span className="xdj-az-bpm-label">BPM</span>
            <span className="xdj-az-bpm-value">AUTO</span>
          </div>
        </div>
      </div>

      <div className="xdj-az-player-cue-bar">
        <div className="xdj-az-cue-stat">
          <span className="xdj-az-cue-stat-label">CUE IN</span>
          {isAdmin ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={cue.startTime}
                onChange={(e) => onUpdateTrack(currentTrack.id, "startTime", e.target.value)}
                className="xdj-az-cue-input"
              />
              <button
                type="button"
                className="xdj-az-cue-set-btn"
                onClick={() => setCueFromPlayhead("start")}
                title="קבע IN לפי מיקום הנגן"
              >
                SET
              </button>
            </div>
          ) : (
            <span className="xdj-az-cue-stat-value xdj-az-cue-in-val">{formatTime(cue.startTime)}</span>
          )}
        </div>
        <div className="xdj-az-cue-stat">
          <span className="xdj-az-cue-stat-label">CUE OUT</span>
          {isAdmin ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={cue.endTime}
                onChange={(e) => onUpdateTrack(currentTrack.id, "endTime", e.target.value)}
                className="xdj-az-cue-input"
              />
              <button
                type="button"
                className="xdj-az-cue-set-btn"
                onClick={() => setCueFromPlayhead("end")}
                title="קבע OUT לפי מיקום הנגן"
              >
                SET
              </button>
            </div>
          ) : (
            <span className="xdj-az-cue-stat-value xdj-az-cue-out-val">{formatTime(cue.endTime)}</span>
          )}
        </div>
        <div className="xdj-az-cue-stat">
          <span className="xdj-az-cue-stat-label">LENGTH</span>
          <span className="xdj-az-cue-stat-value">{formatTime(previewLength)}</span>
        </div>
        <div className="xdj-az-cue-stat xdj-az-cue-stat-pos">
          <span className="xdj-az-cue-stat-label">POSITION</span>
          <span className="xdj-az-cue-stat-value">{formatTime(currentTime)}</span>
        </div>
        {isAdmin && (
          <label className="xdj-az-link-cues" title="גרירת A או B מזיזה את שניהם יחד (אורך קבוע)">
            <input
              type="checkbox"
              checked={linkCues}
              onChange={(e) => setLinkCues(e.target.checked)}
            />
            <span>קשר סמנים</span>
          </label>
        )}
      </div>
    </div>
  );
}
