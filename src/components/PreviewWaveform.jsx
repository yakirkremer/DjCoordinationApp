import React, { useMemo } from "react";
import { normalizePreviewCue } from "../lib/previewCue";
import { getDropPlayerCssVars, getDropWaveformColors } from "../lib/dropTypeColors";
import { useDropColors } from "../hooks/useDropColors";
import { useAppSettingsContext } from "../lib/i18n/AppSettingsContext";

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

function buildRgbBars(seed, count) {
  const bars = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 16807 + 12345) % 2147483647;
    const r = (s % 100) / 100;
    s = (s * 16807 + 12345) % 2147483647;
    const g = (s % 100) / 100;
    s = (s * 16807 + 12345) % 2147483647;
    const b = (s % 100) / 100;
    s = (s * 16807 + 12345) % 2147483647;
    const amp = 0.2 + ((s % 100) / 100) * 0.8;
    const total = r + g + b || 1;
    bars.push({
      low: r / total,
      mid: g / total,
      high: b / total,
      amp,
    });
  }
  return bars;
}

function buildRekordboxBars(seed, count) {
  const bars = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 16807 + 12345) % 2147483647;
    const amp = 0.25 + ((s % 100) / 100) * 0.75;
    s = (s * 16807 + 12345) % 2147483647;
    const kick = i % 6 === 0 ? 0.85 + (s % 15) / 100 : 0.2 + ((s % 60) / 100) * 0.5;
    s = (s * 16807 + 12345) % 2147483647;
    const body = 0.35 + ((s % 100) / 100) * 0.55;
    s = (s * 16807 + 12345) % 2147483647;
    const detail = 0.3 + ((s % 100) / 100) * 0.7;
    bars.push({
      high: detail * amp,
      mid: body * amp,
      low: kick * amp,
    });
  }
  return bars;
}

function ClassicBars({ bars, cueLeft, cueWidth, isPlaying, waveColors }) {
  const played = waveColors?.wavePlayed ?? "var(--theme-wave-played)";
  const unplayed = waveColors?.waveUnplayed ?? "var(--theme-wave-unplayed)";
  const accent = waveColors?.accent ?? "var(--theme-accent)";

  return bars.map((h, i) => {
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
        fill={inCue ? (isPlaying ? accent : played) : unplayed}
        opacity={inCue ? 1 : 0.7}
      />
    );
  });
}

function RgbBars({ bars, cueLeft, cueWidth, isPlaying, waveColors }) {
  const palette = waveColors?.rgbPalette;
  const lowColor = palette?.low ?? "#e85d3b";
  const midColor = palette?.mid ?? "#3dd68c";
  const highColor = palette?.high ?? "#4d9fff";

  return bars.map((b, i) => {
    const x = i * 2;
    const barH = b.amp * 20;
    const lowH = barH * b.low;
    const midH = barH * b.mid;
    const highH = barH * b.high;
    const bottom = 22;
    const pos = (i / bars.length) * 100;
    const inCue = pos >= cueLeft && pos <= cueLeft + cueWidth;
    const opacity = inCue ? 1 : 0.55;

    return (
      <g key={i} opacity={isPlaying && inCue ? 1 : opacity}>
        <rect x={x} y={bottom - lowH} width={1.2} height={lowH} fill={lowColor} />
        <rect x={x} y={bottom - lowH - midH} width={1.2} height={midH} fill={midColor} />
        <rect x={x} y={bottom - barH} width={1.2} height={highH} fill={highColor} />
      </g>
    );
  });
}

function RekordboxBars({ bars, cueLeft, cueWidth, isPlaying, waveColors }) {
  const palette = waveColors?.rgbPalette;
  const highColor = palette?.high ?? "#2f6fd4";
  const midColor = palette?.mid ?? "#c47942";
  const lowColor = palette?.low ?? "#ebe3d0";

  return bars.map((b, i) => {
    const x = i * 2;
    const center = 12;
    const maxH = 10;
    const highH = b.high * maxH;
    const midH = b.mid * maxH * 0.82;
    const lowH = b.low * maxH * 0.58;
    const pos = (i / bars.length) * 100;
    const inCue = pos >= cueLeft && pos <= cueLeft + cueWidth;
    const opacity = inCue ? (isPlaying ? 1 : 0.88) : 0.62;

    return (
      <g key={i} opacity={opacity}>
        <rect x={x} y={center - highH} width={1.2} height={highH * 2} fill={highColor} />
        <rect x={x} y={center - midH} width={1.2} height={midH * 2} fill={midColor} />
        <rect x={x} y={center - lowH} width={1.2} height={lowH * 2} fill={lowColor} />
      </g>
    );
  });
}

function LineWave({ bars, cueLeft, cueWidth, isPlaying, waveColors }) {
  const played = waveColors?.wavePlayed ?? "var(--theme-wave-played)";
  const accent = waveColors?.accent ?? "var(--theme-accent)";

  const points = bars
    .map((h, i) => {
      const x = (i / (bars.length - 1)) * 96;
      const y = 24 - h * 18;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <>
      <polyline
        points={`0,24 ${points} 96,24`}
        fill={isPlaying ? `color-mix(in srgb, ${accent} 35%, transparent)` : `color-mix(in srgb, ${played} 25%, transparent)`}
        stroke="none"
      />
      <polyline
        points={points}
        fill="none"
        stroke={isPlaying ? accent : played}
        strokeWidth="1.2"
      />
      <rect x={(cueLeft / 100) * 96} y={0} width={(cueWidth / 100) * 96} height={24} fill="transparent" />
    </>
  );
}

function MirrorBars({ bars, cueLeft, cueWidth, isPlaying, waveColors }) {
  const played = waveColors?.wavePlayed ?? "var(--theme-wave-played)";
  const unplayed = waveColors?.waveUnplayed ?? "var(--theme-wave-unplayed)";
  const accent = waveColors?.accent ?? "var(--theme-accent)";

  return bars.map((h, i) => {
    const x = i * 2;
    const barH = h * 10;
    const pos = (i / bars.length) * 100;
    const inCue = pos >= cueLeft && pos <= cueLeft + cueWidth;
    const fill = inCue ? (isPlaying ? accent : played) : unplayed;
    return (
      <g key={i}>
        <rect x={x} y={12 - barH} width={1.2} height={barH} fill={fill} opacity={inCue ? 1 : 0.65} />
        <rect x={x} y={12} width={1.2} height={barH} fill={fill} opacity={inCue ? 1 : 0.65} />
      </g>
    );
  });
}

export default function PreviewWaveform({ track, isActive, isPlaying }) {
  const { activeWaveformStyle } = useAppSettingsContext();
  const { colorMap } = useDropColors();
  const seed = hashId(track.id);
  const bars = useMemo(() => buildBars(seed, 48), [seed]);
  const rgbBars = useMemo(() => buildRgbBars(seed, 48), [seed]);
  const rekordboxBars = useMemo(() => buildRekordboxBars(seed, 48), [seed]);
  const cue = useMemo(() => normalizePreviewCue(track), [track]);

  const drop = track?.drop?.trim() || "";
  const waveColors = useMemo(
    () => (drop ? getDropWaveformColors(drop, colorMap) : null),
    [drop, colorMap]
  );
  const previewStyle = useMemo(
    () => (drop ? getDropPlayerCssVars(drop, colorMap) : {}),
    [drop, colorMap]
  );

  const trackDuration = cue.duration ?? Math.max(cue.endTime + 30, (cue.endTime - cue.startTime) * 2.5);
  const span = Math.max(cue.endTime - cue.startTime, 1);
  const cueLeft = Math.min(100, (cue.startTime / trackDuration) * 100);
  const cueWidth = Math.min(100 - cueLeft, (span / trackDuration) * 100);

  const styleClass = `xdj-az-preview-wave xdj-az-preview-wave--${activeWaveformStyle}`;
  const waveProps = { cueLeft, cueWidth, isPlaying, waveColors };

  let inner = null;
  if (activeWaveformStyle === "rekordbox") {
    inner = <RekordboxBars bars={rekordboxBars} {...waveProps} />;
  } else if (activeWaveformStyle === "frequency-rgb") {
    inner = <RgbBars bars={rgbBars} {...waveProps} />;
  } else if (activeWaveformStyle === "line") {
    inner = <LineWave bars={bars} {...waveProps} />;
  } else if (activeWaveformStyle === "mirror") {
    inner = <MirrorBars bars={bars} {...waveProps} />;
  } else if (activeWaveformStyle === "neon-bars") {
    const accent = waveColors?.accent ?? "var(--theme-accent)";
    const unplayed = waveColors?.waveUnplayed ?? "#2a3050";
    inner = bars.map((h, i) => {
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
          width={1}
          height={barH}
          fill={inCue ? (isPlaying ? accent : waveColors?.wavePlayed ?? "#ffee55") : unplayed}
          opacity={inCue ? 1 : 0.85}
        />
      );
    });
  } else {
    inner = <ClassicBars bars={bars} {...waveProps} />;
  }

  return (
    <div
      className={`${styleClass} ${isActive ? "is-active" : ""} ${isPlaying ? "is-playing" : ""} ${
        drop ? "has-drop-theme" : ""
      }`}
      style={previewStyle}
      title="Touch preview"
    >
      <svg viewBox="0 0 96 24" className="w-full h-full" preserveAspectRatio="none">
        {inner}
      </svg>
      <div className="xdj-az-cue-zone" style={{ left: `${cueLeft}%`, width: `${cueWidth}%` }} />
    </div>
  );
}
