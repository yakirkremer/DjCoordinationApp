#!/usr/bin/env node
/**
 * Pre-compute RGB frequency-band waveform peaks from an audio file.
 *
 * Usage:
 *   node scripts/compute-rgb-waveform.mjs path/to/track.mp3
 *   node scripts/compute-rgb-waveform.mjs path/to/track.mp3 --bars 200 --out peaks.json
 *
 * Output JSON: { barCount, peaks: [{ low, mid, high, amp }, ...] }
 * Bass ≈ low (red), mids ≈ mid (green), highs ≈ high (blue) in the UI.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

const SAMPLE_RATE = 8000;
const DEFAULT_BARS = 160;

function analyzeBandEnergies(samples, smoothWindow = 8) {
  const len = samples.length;
  if (len === 0) return { low: 0.33, mid: 0.34, high: 0.33, amp: 0 };

  let amp = 0;
  let lowE = 0;
  let midE = 0;
  let highE = 0;

  for (let j = 0; j < len; j++) {
    const v = Math.abs(samples[j]);
    amp = Math.max(amp, v);
    const w0 = Math.max(0, j - smoothWindow);
    let sum = 0;
    for (let k = w0; k <= j; k++) sum += samples[k];
    const avg = sum / (j - w0 + 1);
    const lowComp = Math.abs(avg);
    const highComp = Math.max(0, v - lowComp * 0.85);
    const midComp = Math.max(0, v - lowComp * 0.55 - highComp * 0.45);
    lowE += lowComp;
    midE += midComp;
    highE += highComp;
  }

  lowE /= len;
  midE /= len;
  highE /= len;
  const total = lowE + midE + highE || 1;
  return {
    low: Number((lowE / total).toFixed(4)),
    mid: Number((midE / total).toFixed(4)),
    high: Number((highE / total).toFixed(4)),
    amp: Number(amp.toFixed(4)),
  };
}

function decodeToMonoF32(filePath) {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static not available");
  }

  const result = spawnSync(
    ffmpegPath,
    ["-i", filePath, "-f", "f32le", "-ac", "1", "-ar", String(SAMPLE_RATE), "pipe:1"],
    { encoding: "buffer", maxBuffer: 512 * 1024 * 1024 }
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const err = result.stderr?.toString?.() || "ffmpeg failed";
    throw new Error(err);
  }

  const buf = result.stdout;
  const samples = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  return samples;
}

function computeRgbPeaks(samples, barCount) {
  const samplesPerBar = samples.length / barCount;
  const peaks = [];

  for (let i = 0; i < barCount; i++) {
    const start = Math.floor(i * samplesPerBar);
    const end = Math.min(samples.length, Math.floor((i + 1) * samplesPerBar));
    const slice = samples.subarray(start, end);
    const smooth = Math.max(4, Math.floor(samplesPerBar / 3));
    peaks.push(analyzeBandEnergies(slice, smooth));
  }

  return peaks;
}

function parseArgs(argv) {
  const args = { bars: DEFAULT_BARS, out: null, file: null };
  const rest = [...argv];
  while (rest.length) {
    const token = rest.shift();
    if (token === "--bars") args.bars = parseInt(rest.shift(), 10) || DEFAULT_BARS;
    else if (token === "--out") args.out = rest.shift();
    else if (!args.file) args.file = token;
  }
  return args;
}

const { file, bars, out } = parseArgs(process.argv.slice(2));

if (!file) {
  console.error("Usage: node scripts/compute-rgb-waveform.mjs <audio-file> [--bars 160] [--out peaks.json]");
  process.exit(1);
}

const abs = path.resolve(file);
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`);
  process.exit(1);
}

const samples = decodeToMonoF32(abs);
const peaks = computeRgbPeaks(samples, bars);
const payload = {
  source: path.basename(abs),
  sampleRate: SAMPLE_RATE,
  barCount: bars,
  peaks,
};

const json = JSON.stringify(payload, null, 2);
if (out) {
  fs.writeFileSync(path.resolve(out), json, "utf8");
  console.log(`Wrote ${peaks.length} RGB peaks → ${path.resolve(out)}`);
} else {
  process.stdout.write(json);
}
