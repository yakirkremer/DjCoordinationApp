/** Waveform visual styles — register here and in designStyles.js */

export const WAVEFORM_STYLES = [
  {
    id: "classic",
    nameHe: "קלאסי",
    nameEn: "Classic",
    descHe: "עמודות כחולות עם התקדמות כתומה",
    descEn: "Blue bars with orange progress",
    preview: "classic",
  },
  {
    id: "neon-bars",
    nameHe: "ניאון צפוף",
    nameEn: "Neon dense",
    descHe: "עמודות דקות וצבעוניות",
    descEn: "Thin, vivid bars",
    preview: "neon",
  },
  {
    id: "line",
    nameHe: "קו רציף",
    nameEn: "Line",
    descHe: "גל קול כקו חלק",
    descEn: "Smooth filled line waveform",
    preview: "line",
  },
  {
    id: "mirror",
    nameHe: "מראה",
    nameEn: "Mirror",
    descHe: "עמודות סימטריות ממרכז הדק",
    descEn: "Symmetric bars from center",
    preview: "mirror",
  },
  {
    id: "frequency-rgb",
    nameHe: "תדרים RGB",
    nameEn: "Frequency RGB",
    descHe: "צבע לפי תדרים — בס אדום, אמצע ירוק, גבוהים כחול",
    descEn: "Color by frequency — bass red, mids green, highs blue",
    preview: "rgb",
  },
  {
    id: "rekordbox",
    nameHe: "Rekordbox",
    nameEn: "Rekordbox",
    descHe: "שכבות תדרים מראה — כחול, כתום, קרם (כמו Pioneer)",
    descEn: "Mirrored 3-band layers — blue, orange, cream (Pioneer style)",
    preview: "rekordbox",
  },
];

export const DEFAULT_WAVEFORM_STYLE_ID = "classic";

const STORAGE_KEY = "kramer-waveform-style-v1";

export function getWaveformStyleById(id) {
  return WAVEFORM_STYLES.find((s) => s.id === id) ?? WAVEFORM_STYLES[0];
}

export function readStoredWaveformStyle() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return WAVEFORM_STYLES.some((s) => s.id === value) ? value : null;
  } catch {
    return null;
  }
}

export function applyWaveformStyle(styleId) {
  const id = getWaveformStyleById(styleId).id;
  document.documentElement.dataset.waveformStyle = id;
  return id;
}

export function setPersonalWaveformStyle(styleId) {
  const id = getWaveformStyleById(styleId).id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  applyWaveformStyle(id);
  return id;
}

export function getStyleLabel(style, locale) {
  return locale === "he" ? style.nameHe : style.nameEn;
}

export function getStyleDesc(style, locale) {
  return locale === "he" ? style.descHe : style.descEn;
}

function themeColors() {
  if (typeof document === "undefined") {
    return { wave: "#1e3a5f", progress: "#2d9cff", accent: "#ff5500" };
  }
  const root = getComputedStyle(document.documentElement);
  return {
    wave: root.getPropertyValue("--theme-wave-unplayed").trim() || "#1e3a5f",
    progress: root.getPropertyValue("--theme-wave-played").trim() || "#2d9cff",
    accent: root.getPropertyValue("--theme-accent").trim() || "#ff5500",
  };
}

/** Build WaveSurfer.create() options for a visual style. */
export function getWaveSurferOptions(styleId, height = 88, dropWaveColors = null) {
  const theme = themeColors();
  const colors = dropWaveColors
    ? {
        wave: dropWaveColors.waveUnplayed,
        progress: dropWaveColors.wavePlayed,
        accent: dropWaveColors.accent,
        palette: dropWaveColors.rgbPalette,
      }
    : {
        wave: theme.wave,
        progress: theme.progress,
        accent: theme.accent,
        palette: null,
      };

  const base = {
    responsive: true,
    height,
    backend: "MediaElement",
    cursorColor: "#ffffff",
    cursorWidth: 2,
    waveColor: colors.wave,
    progressColor: colors.progress,
  };

  const rgbPalette = colors.palette ?? undefined;
  const rekordboxPalette = colors.palette
    ? {
        high: colors.palette.high,
        mid: colors.palette.mid,
        low: colors.palette.low,
      }
    : undefined;

  switch (styleId) {
    case "neon-bars":
      return {
        ...base,
        barWidth: 1,
        barGap: 0,
        barRadius: 1,
        waveColor: colors.wave,
        progressColor: colors.accent,
      };
    case "line":
      return {
        ...base,
        barWidth: 0,
        barGap: 0,
      };
    case "mirror":
      return {
        ...base,
        barWidth: 2,
        barGap: 1,
        barRadius: 0,
        barAlign: "center",
        normalize: true,
        barHeight: 1.8,
      };
    case "frequency-rgb":
      return {
        ...base,
        barWidth: 0,
        barGap: 0,
        renderFunction: createRgbRenderFunction(rgbPalette),
        waveColor: "#ffffff",
        progressColor: "#ffffff",
      };
    case "rekordbox":
      return {
        ...base,
        barWidth: 0,
        barGap: 0,
        normalize: true,
        renderFunction: createRekordboxRenderFunction(rekordboxPalette),
        waveColor: "#ffffff",
        progressColor: "#ffffff",
        cursorColor: "#ffffff",
        cursorWidth: 2,
      };
    case "classic":
    default:
      return {
        ...base,
        barWidth: 2,
        barGap: 1,
        barRadius: 0,
      };
  }
}

/**
 * Analyze one slice of PCM and estimate low / mid / high energy (0–1 each).
 * Uses moving-average separation — fast approximation, no FFT dependency.
 */
export function analyzeBandEnergies(samples, smoothWindow = 8) {
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
    low: lowE / total,
    mid: midE / total,
    high: highE / total,
    amp,
  };
}

/** Rekordbox-style palette — highs blue (outer), mids orange, bass cream (inner). */
export const REKORDBOX_PALETTE = {
  high: "#2f6fd4",
  mid: "#c47942",
  low: "#ebe3d0",
};

/**
 * Per-slice band envelopes for Rekordbox rendering.
 * High = jagged peak detail, mid = RMS body, low = smoothed kick envelope.
 */
export function analyzeRekordboxBands(samples, smoothWindow) {
  const len = samples.length;
  if (len === 0) return { high: 0, mid: 0, low: 0 };

  const win = smoothWindow ?? Math.max(3, Math.floor(len / 6));
  const winLow = Math.max(win * 2, 4);

  let peakHigh = 0;
  let sumMidSq = 0;
  let peakLow = 0;

  for (let j = 0; j < len; j++) {
    const v = samples[j];
    const abs = Math.abs(v);

    const w0 = Math.max(0, j - winLow);
    let sum = 0;
    for (let k = w0; k <= j; k++) sum += Math.abs(samples[k]);
    const lowEnv = sum / (j - w0 + 1);
    peakLow = Math.max(peakLow, lowEnv);

    const highVal = Math.max(0, abs - lowEnv * 0.78);
    peakHigh = Math.max(peakHigh, highVal);

    const midVal = Math.max(0, abs - lowEnv * 0.42 - highVal * 0.38);
    sumMidSq += midVal * midVal;
  }

  const midRms = Math.sqrt(sumMidSq / len);
  const high = Math.min(1, peakHigh * 1.2);
  const mid = Math.min(1, midRms * 1.3);
  const low = Math.min(1, Math.pow(peakLow, 0.82) * 1.15);
  const maxBand = Math.max(high, mid, low, 0.001);

  return {
    high: high / maxBand,
    mid: mid / maxBand,
    low: low / maxBand,
  };
}

/** Mirrored 3-layer Rekordbox waveform (blue → orange → cream). */
export function createRekordboxRenderFunction(palette) {
  const colors = { ...REKORDBOX_PALETTE, ...(palette || {}) };

  return (channelData, ctx) => {
    const channel = Array.isArray(channelData) ? channelData[0] : channelData;
    if (!channel?.length) return;

    const { width, height } = ctx.canvas;
    const barCount = Math.max(1, Math.floor(width * 1.15));
    const samplesPerBar = channel.length / barCount;
    const barW = Math.max(1, width / barCount);
    const centerY = height / 2;
    const maxHalf = height * 0.49;

    for (let i = 0; i < barCount; i++) {
      const start = Math.floor(i * samplesPerBar);
      const end = Math.min(channel.length, Math.floor((i + 1) * samplesPerBar));
      if (end <= start) continue;

      const slice = channel.subarray(start, end);
      const smooth = Math.max(2, Math.floor(samplesPerBar / 4));
      const { high, mid, low } = analyzeRekordboxBands(slice, smooth);

      if (high < 0.03 && mid < 0.03 && low < 0.03) continue;

      const x = (i / barCount) * width;
      const highH = high * maxHalf;
      const midH = mid * maxHalf * 0.82;
      const lowH = low * maxHalf * 0.58;

      ctx.fillStyle = colors.high;
      ctx.fillRect(x, centerY - highH, barW, highH * 2);

      ctx.fillStyle = colors.mid;
      ctx.fillRect(x, centerY - midH, barW, midH * 2);

      ctx.fillStyle = colors.low;
      ctx.fillRect(x, centerY - lowH, barW, lowH * 2);
    }
  };
}

/** Custom WaveSurfer renderFunction — RGB bars by frequency band. */
export function createRgbRenderFunction(palette = {}) {
  const lowColor = palette.low ?? "#e85d3b";
  const midColor = palette.mid ?? "#3dd68c";
  const highColor = palette.high ?? "#4d9fff";

  return (channelData, ctx) => {
    const channel = Array.isArray(channelData) ? channelData[0] : channelData;
    if (!channel?.length) return;

    const { width, height } = ctx.canvas;
    const barCount = Math.max(1, Math.floor(width));
    const samplesPerBar = channel.length / barCount;
    const barW = Math.max(1, width / barCount - 0.5);

    for (let i = 0; i < barCount; i++) {
      const start = Math.floor(i * samplesPerBar);
      const end = Math.min(channel.length, Math.floor((i + 1) * samplesPerBar));
      if (end <= start) continue;

      const slice = channel.subarray(start, end);
      const smooth = Math.max(4, Math.floor(samplesPerBar / 3));
      const { low, mid, high, amp } = analyzeBandEnergies(slice, smooth);
      const barH = amp * height * 0.94;
      if (barH < 0.5) continue;

      const x = (i / barCount) * width;
      const lowH = barH * low;
      const midH = barH * mid;
      const highH = barH * high;
      const bottom = (height + barH) / 2;

      ctx.fillStyle = lowColor;
      ctx.fillRect(x, bottom - lowH, barW, lowH);
      ctx.fillStyle = midColor;
      ctx.fillRect(x, bottom - lowH - midH, barW, midH);
      ctx.fillStyle = highColor;
      ctx.fillRect(x, bottom - barH, barW, highH);
    }
  };
}

/** Analyze full AudioBuffer into Rekordbox band data for previews / caching. */
export function computeRekordboxPeaksFromBuffer(audioBuffer, barCount = 120) {
  const channel = audioBuffer.getChannelData(0);
  const samplesPerBar = channel.length / barCount;
  const peaks = [];

  for (let i = 0; i < barCount; i++) {
    const start = Math.floor(i * samplesPerBar);
    const end = Math.min(channel.length, Math.floor((i + 1) * samplesPerBar));
    const slice = channel.subarray(start, end);
    const smooth = Math.max(2, Math.floor(samplesPerBar / 4));
    peaks.push(analyzeRekordboxBands(slice, smooth));
  }

  return peaks;
}

export async function computeRekordboxPeaksFromUrl(url, barCount = 120) {
  const buffer = await decodeAudioFromUrl(url);
  return computeRekordboxPeaksFromBuffer(buffer, barCount);
}

/** Analyze full AudioBuffer into RGB band data for previews / caching. */
export function computeRgbPeaksFromBuffer(audioBuffer, barCount = 120) {
  const channel = audioBuffer.getChannelData(0);
  const samplesPerBar = channel.length / barCount;
  const peaks = [];

  for (let i = 0; i < barCount; i++) {
    const start = Math.floor(i * samplesPerBar);
    const end = Math.min(channel.length, Math.floor((i + 1) * samplesPerBar));
    const slice = channel.subarray(start, end);
    const smooth = Math.max(4, Math.floor(samplesPerBar / 3));
    peaks.push(analyzeBandEnergies(slice, smooth));
  }

  return peaks;
}

export async function decodeAudioFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch audio (${res.status})`);
  const arrayBuffer = await res.arrayBuffer();
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await ctx.close().catch(() => {});
  }
}

export async function computeRgbPeaksFromUrl(url, barCount = 120) {
  const buffer = await decodeAudioFromUrl(url);
  return computeRgbPeaksFromBuffer(buffer, barCount);
}
