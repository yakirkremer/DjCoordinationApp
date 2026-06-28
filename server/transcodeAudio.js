import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

let ffmpegPathPromise = null;

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

/** Re-encode MP3 to a smaller streaming-friendly file (128kbps by default). */
export async function optimizeMp3Buffer(buffer) {
  if (!isTranscodeEnabled() || !buffer?.length) return buffer;

  const ffmpeg = await resolveFfmpegPath();
  if (!ffmpeg) {
    console.warn("ffmpeg-static not installed — skipping MP3 compression");
    return buffer;
  }

  const bitrate = process.env.AUDIO_BITRATE || "128k";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpIn = path.join(os.tmpdir(), `km-in-${id}.mp3`);
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

    const optimized = await fs.readFile(tmpOut);
    if (!optimized.length) return buffer;

    if (optimized.length < buffer.length) {
      console.log(
        `MP3 optimized: ${(buffer.length / 1024 / 1024).toFixed(2)}MB → ${(optimized.length / 1024 / 1024).toFixed(2)}MB @ ${bitrate}`
      );
      return optimized;
    }

    return buffer;
  } catch (err) {
    console.warn("MP3 optimization skipped:", err.message);
    return buffer;
  } finally {
    await fs.unlink(tmpIn).catch(() => {});
    await fs.unlink(tmpOut).catch(() => {});
  }
}
