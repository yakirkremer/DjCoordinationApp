import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

let ffmpegPathPromise = null;

const SUPPORTED_INPUT_EXTS = new Set([".mp3", ".wav"]);

async function resolveFfmpegPath() {
  if (!ffmpegPathPromise) {
    ffmpegPathPromise = import("ffmpeg-static")
      .then((mod) => mod.default || mod)
      .catch(() => null);
  }
  return ffmpegPathPromise;
}

export function isTranscodeEnabled() {
  return process.env.AUDIO_TRANSCODE !== "0";
}

export function getAudioExtension(filename) {
  return path.extname(filename || "").toLowerCase();
}

export function isSupportedAudioFilename(filename) {
  return SUPPORTED_INPUT_EXTS.has(getAudioExtension(filename));
}

/** Catalog tracks are always stored as .mp3 on disk. */
export function toCatalogMp3Filename(filename) {
  const base = path.basename(filename);
  const ext = getAudioExtension(base);
  if (ext === ".wav") {
    return `${base.slice(0, -ext.length)}.mp3`;
  }
  if (ext === ".mp3") return base;
  throw new Error("Only .mp3 and .wav files are supported");
}

function runFfmpeg(ffmpeg, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim().slice(-400) || `ffmpeg failed (${code})`));
    });
  });
}

/**
 * Encode any supported input buffer to MP3 (128kbps by default).
 * @param {boolean} allowKeepOriginal - when true and input is MP3, return original if output is not smaller
 */
export async function transcodeToMp3Buffer(buffer, inputExt, { allowKeepOriginal = false } = {}) {
  if (!buffer?.length) return buffer;

  const ext = inputExt.startsWith(".") ? inputExt : `.${inputExt}`;
  if (!SUPPORTED_INPUT_EXTS.has(ext)) {
    throw new Error("Only .mp3 and .wav files are supported");
  }

  const ffmpeg = await resolveFfmpegPath();
  if (!ffmpeg) {
    if (ext === ".wav") {
      throw new Error("WAV upload requires ffmpeg on the server");
    }
    return buffer;
  }

  const bitrate = process.env.AUDIO_BITRATE || "128k";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpIn = path.join(os.tmpdir(), `km-in-${id}${ext}`);
  const tmpOut = path.join(os.tmpdir(), `km-out-${id}.mp3`);

  try {
    await fs.writeFile(tmpIn, buffer);
    await runFfmpeg(ffmpeg, [
      "-y",
      "-i",
      tmpIn,
      "-vn",
      "-acodec",
      "libmp3lame",
      "-b:a",
      bitrate,
      "-ar",
      "44100",
      "-ac",
      "2",
      tmpOut,
    ]);

    const encoded = await fs.readFile(tmpOut);
    if (!encoded.length) {
      throw new Error("ffmpeg produced an empty file");
    }

    if (allowKeepOriginal && ext === ".mp3" && encoded.length >= buffer.length) {
      return buffer;
    }

    const label = ext === ".wav" ? "WAV→MP3" : "MP3 optimized";
    console.log(
      `${label}: ${(buffer.length / 1024 / 1024).toFixed(2)}MB → ${(encoded.length / 1024 / 1024).toFixed(2)}MB @ ${bitrate}`
    );
    return encoded;
  } finally {
    await fs.unlink(tmpIn).catch(() => {});
    await fs.unlink(tmpOut).catch(() => {});
  }
}

/** Re-encode MP3 to a smaller streaming-friendly file (128kbps by default). */
export async function optimizeMp3Buffer(buffer) {
  if (!isTranscodeEnabled() || !buffer?.length) return buffer;

  try {
    return await transcodeToMp3Buffer(buffer, ".mp3", { allowKeepOriginal: true });
  } catch (err) {
    console.warn("MP3 optimization skipped:", err.message);
    return buffer;
  }
}

/** Normalize upload/reload: WAV always becomes 128k MP3; MP3 may be recompressed when enabled. */
export async function prepareUploadAudio(buffer, filename) {
  const ext = getAudioExtension(filename);
  if (!SUPPORTED_INPUT_EXTS.has(ext)) {
    throw new Error("Only .mp3 and .wav files are supported");
  }

  if (ext === ".wav") {
    const mp3Buffer = await transcodeToMp3Buffer(buffer, ".wav");
    return { buffer: mp3Buffer, filename: toCatalogMp3Filename(filename) };
  }

  const mp3Buffer = isTranscodeEnabled()
    ? await transcodeToMp3Buffer(buffer, ".mp3", { allowKeepOriginal: true })
    : buffer;

  return { buffer: mp3Buffer, filename: toCatalogMp3Filename(filename) };
}
