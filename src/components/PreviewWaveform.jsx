import React, { useMemo } from "react";
import { normalizePreviewCue } from "../lib/previewCue";

function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function buildBars(seed, count) {
  const bars = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 16807 + 12345) % 2147483647;
    bars.push(0.15 + ((s % 100) / 100) * 0.85);
  }
  return bars;
}

export default function PreviewWaveform({ track, isActive, isPlaying }) {
  const bars = useMemo(() => buildBars(hashId(track.id), 48), [track.id]);
  const cue = useMemo(() => normalizePreviewCue(track), [track]);

  const trackDuration = cue.duration ?? Math.max(cue.endTime + 30, (cue.endTime - cue.startTime) * 2.5);
  const span = Math.max(cue.endTime - cue.startTime, 1);
  const cueLeft = Math.min(100, (cue.startTime / trackDuration) * 100);
  const cueWidth = Math.min(100 - cueLeft, (span / trackDuration) * 100);

  return (
    <div
      className={`xdj-az-preview-wave ${isActive ? "is-active" : ""} ${isPlaying ? "is-playing" : ""}`}
      title="Touch preview"
    >
      <svg viewBox="0 0 96 24" className="w-full h-full" preserveAspectRatio="none">
        {bars.map((h, i) => {
          const x = i * 2;
          const barH = h * 20;
          const y = 24 - barH;
          const pos = (i / bars.length) * 100;
          const inCue = pos >= cueLeft && pos <= cueLeft + cueWidth;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={1.2}
              height={barH}
              fill={inCue ? (isPlaying ? "#ff6b2c" : "#00c8e8") : "#3a3a48"}
              opacity={inCue ? 1 : 0.7}
            />
          );
        })}
      </svg>
      <div
        className="xdj-az-cue-zone"
        style={{ left: `${cueLeft}%`, width: `${cueWidth}%` }}
      />
    </div>
  );
}
