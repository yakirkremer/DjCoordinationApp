import React, { useEffect, useRef, useState, useMemo } from "react";
import WaveSurfer from "wavesurfer.js";
import TrackArtwork from "./TrackArtwork";
import { normalizePreviewCue, isWithinPreviewCue } from "../lib/previewCue";

export default function GlobalPlayer({
  currentTrack,
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
  formatTime,
  onUpdateTrack,
  isAdmin = false,
  resolveTrackUrl,
}) {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [showElapsed, setShowElapsed] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const cue = useMemo(() => normalizePreviewCue(currentTrack), [currentTrack]);
  const previewLength = cue.endTime - cue.startTime;
  const progressInCue = Math.max(0, Math.min(currentTime - cue.startTime, previewLength));
  const remainInCue = Math.max(0, previewLength - progressInCue);
  const displayTime = showElapsed ? progressInCue : remainInCue;

  const cueInPct = duration > 0 ? (cue.startTime / duration) * 100 : 0;
  const cueOutPct = duration > 0 ? (cue.endTime / duration) * 100 : 100;
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const seekToCueIn = (ws) => {
    if (!ws) return;
    const dur = ws.getDuration();
    if (!dur) return;
    const start = Math.min(cue.startTime, Math.max(0, dur - 1));
    ws.setTime(start);
    setCurrentTime(start);
  };

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

      const isRemote = /^https?:\/\//i.test(audioUrl);

      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#1e3a5f",
        progressColor: "#2d9cff",
        cursorColor: "#ffffff",
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 0,
        responsive: true,
        height: 88,
        backend: isRemote ? "MediaElement" : "WebAudio",
      });

      wavesurferRef.current.on("ready", () => {
        if (cancelled) return;
        const dur = wavesurferRef.current.getDuration();
        setDuration(dur);
        seekToCueIn(wavesurferRef.current);

        if (isPlaying) {
          wavesurferRef.current.play().catch((err) => console.log("Playback blocked:", err));
        }
      });

      wavesurferRef.current.on("error", () => {
        if (!cancelled) setLoadError("Playback error — try syncing Dropbox again.");
      });

      wavesurferRef.current.on("timeupdate", (time) => {
        setCurrentTime(time);
        if (time >= cue.endTime) {
          wavesurferRef.current.pause();
          setIsPlaying(false);
          seekToCueIn(wavesurferRef.current);
        }
      });

      wavesurferRef.current.on("interaction", () => {
        const time = wavesurferRef.current.getCurrentTime();
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
  }, [currentTrack?.id, cue.startTime, cue.endTime, resolveTrackUrl]);

  useEffect(() => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      if (!isWithinPreviewCue(cue, wavesurferRef.current.getCurrentTime())) {
        seekToCueIn(wavesurferRef.current);
      }
      wavesurferRef.current.play().catch(() => setIsPlaying(false));
    } else {
      wavesurferRef.current.pause();
    }
  }, [isPlaying, cue.startTime, cue.endTime]);

  return (
    <div className="xdj-az-player shrink-0" dir="ltr">
      {/* Deck info strip */}
      <div className="xdj-az-player-deck-bar">
        <div className="xdj-az-player-deck-left">
          <span className="xdj-az-deck-badge">1</span>
          <div className="xdj-az-player-track-meta">
            <h4 className="xdj-az-player-title">{currentTrack.title}</h4>
            <p className="xdj-az-player-artist">{currentTrack.artist}</p>
          </div>
        </div>
        <div className="xdj-az-player-deck-center">
          <span className="xdj-az-player-tag">{currentTrack.bucket}</span>
          <span className="xdj-az-player-tag xdj-az-player-tag-dim">PREVIEW CUE</span>
        </div>
        <div className="xdj-az-player-deck-right">
          {loadError ? (
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
        {/* Jog / artwork display */}
        <div className="xdj-az-jog-wrap">
          <div className={`xdj-az-jog ${isPlaying ? "is-spinning" : ""}`}>
            <div className="xdj-az-jog-inner">
              <TrackArtwork track={currentTrack} />
            </div>
          </div>
          <span className="xdj-az-jog-label">DECK 1</span>
        </div>

        {/* Enlarged waveform */}
        <div className="xdj-az-wave-panel">
          <div className="xdj-az-wave-enlarged">
            <div className="xdj-az-cue-markers-top">
              {duration > 0 && (
                <>
                  <span className="xdj-az-cue-flag xdj-az-cue-in" style={{ left: `${cueInPct}%` }}>
                    A
                  </span>
                  <span className="xdj-az-cue-flag xdj-az-cue-out" style={{ left: `${cueOutPct}%` }}>
                    B
                  </span>
                </>
              )}
            </div>
            <div className="xdj-az-wave-canvas">
              <div ref={waveformRef} className="w-full" />
              {duration > 0 && (
                <div
                  className="xdj-az-cue-region"
                  style={{ left: `${cueInPct}%`, width: `${cueOutPct - cueInPct}%` }}
                />
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

          {/* Overall waveform overview */}
          <div className="xdj-az-wave-overview">
            <div className="xdj-az-overview-track">
              <div
                className="xdj-az-overview-played"
                style={{ width: `${playheadPct}%` }}
              />
              <div className="xdj-az-overview-playhead" style={{ left: `${playheadPct}%` }} />
              {duration > 0 && (
                <div
                  className="xdj-az-overview-cue"
                  style={{ left: `${cueInPct}%`, width: `${cueOutPct - cueInPct}%` }}
                />
              )}
            </div>
            <div className="xdj-az-overview-labels">
              <span>0:00</span>
              <span>{duration > 0 ? formatTime(duration) : "—"}</span>
            </div>
          </div>
        </div>

        {/* Transport + time */}
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
            <span className="xdj-az-time-ms">.{String(Math.floor((currentTime % 1) * 100)).padStart(2, "0")}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`xdj-az-transport-btn ${isPlaying ? "is-playing" : ""}`}
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

          <div className="xdj-az-bpm-block">
            <span className="xdj-az-bpm-label">BPM</span>
            <span className="xdj-az-bpm-value">AUTO</span>
          </div>
        </div>
      </div>

      {/* Cue info strip */}
      <div className="xdj-az-player-cue-bar">
        <div className="xdj-az-cue-stat">
          <span className="xdj-az-cue-stat-label">CUE IN</span>
          {isAdmin ? (
            <input
              type="number"
              value={cue.startTime}
              onChange={(e) => onUpdateTrack(currentTrack.id, "startTime", e.target.value)}
              className="xdj-az-cue-input"
            />
          ) : (
            <span className="xdj-az-cue-stat-value xdj-az-cue-in-val">
              {formatTime(cue.startTime)}
            </span>
          )}
        </div>
        <div className="xdj-az-cue-stat">
          <span className="xdj-az-cue-stat-label">CUE OUT</span>
          {isAdmin ? (
            <input
              type="number"
              value={cue.endTime}
              onChange={(e) => onUpdateTrack(currentTrack.id, "endTime", e.target.value)}
              className="xdj-az-cue-input"
            />
          ) : (
            <span className="xdj-az-cue-stat-value xdj-az-cue-out-val">
              {formatTime(cue.endTime)}
            </span>
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
      </div>
    </div>
  );
}
