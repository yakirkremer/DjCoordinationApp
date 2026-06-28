import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { OFFICIAL_CATEGORIES } from "../src/lib/categories.js";
import { readJsonFile, writeJsonFile, DATA_FILES } from "./dataStore.js";

const ROOT = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
export const MUSIC_ROOT = path.join(ROOT, "public", "music");
export const MAX_MUSIC_BYTES = 80 * 1024 * 1024;

export function sanitizeFilename(name) {
  const base = path.basename(name).replace(/[<>:"|?*\x00-\x1f]/g, "_").trim();
  if (!base.toLowerCase().endsWith(".mp3")) {
    throw new Error("Only .mp3 files are supported");
  }
  return base;
}

export async function uniqueFilename(dir, filename) {
  const ext = path.extname(filename);
  const stem = path.basename(filename, ext);
  let candidate = filename;
  let n = 1;

  while (true) {
    try {
      await fs.access(path.join(dir, candidate));
      candidate = `${stem}_${n}${ext}`;
      n += 1;
    } catch {
      return candidate;
    }
  }
}

export function parseFilenameMeta(filename) {
  const base = path.basename(filename, path.extname(filename));
  const parts = base.split(" - ");
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(" - ").trim(),
    };
  }
  return { artist: "עריכת דיג'יי", title: base };
}

export function generateTrackId() {
  return `track_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function assertValidBucket(bucket) {
  if (!bucket || !OFFICIAL_CATEGORIES.includes(bucket)) {
    throw new Error("Invalid category");
  }
}

export async function saveTrackToCatalog({
  bucket,
  filename,
  buffer,
  title,
  artist,
  dropboxPath = null,
}) {
  assertValidBucket(bucket);

  let safeName;
  try {
    safeName = sanitizeFilename(filename);
  } catch (err) {
    throw new Error(err.message);
  }

  if (buffer.length > MAX_MUSIC_BYTES) {
    throw new Error(`File too large (max ${Math.floor(MAX_MUSIC_BYTES / 1024 / 1024)}MB)`);
  }

  const analyzedDir = path.join(MUSIC_ROOT, bucket, "analyzed");
  await fs.mkdir(analyzedDir, { recursive: true });
  safeName = await uniqueFilename(analyzedDir, safeName);

  const filePath = path.join(analyzedDir, safeName);
  if (!filePath.startsWith(MUSIC_ROOT)) {
    throw new Error("Invalid path");
  }

  await fs.writeFile(filePath, buffer);

  const meta = parseFilenameMeta(safeName);
  const newTrack = {
    id: generateTrackId(),
    title: title?.trim() || meta.title,
    artist: artist?.trim() || meta.artist,
    bucket,
    filename: safeName,
    startTime: 30,
    endTime: 90,
    isMissing: false,
  };

  if (dropboxPath) {
    newTrack.dropboxSourcePath = dropboxPath;
  }

  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  catalog.push(newTrack);
  await writeJsonFile(DATA_FILES.catalog, catalog);

  return newTrack;
}

export async function reloadTrackFile({ trackId, bucket, filename, buffer }) {
  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  const idx = catalog.findIndex((t) => t.id === trackId);
  if (idx === -1) {
    throw new Error("Track not found");
  }

  const track = catalog[idx];
  const targetBucket = bucket || track.bucket;
  assertValidBucket(targetBucket);

  let safeName;
  try {
    safeName = sanitizeFilename(filename || track.filename);
  } catch (err) {
    throw new Error(err.message);
  }

  if (buffer.length > MAX_MUSIC_BYTES) {
    throw new Error(`File too large (max ${Math.floor(MAX_MUSIC_BYTES / 1024 / 1024)}MB)`);
  }

  const analyzedDir = path.join(MUSIC_ROOT, targetBucket, "analyzed");
  await fs.mkdir(analyzedDir, { recursive: true });

  const filePath = path.join(analyzedDir, safeName);
  if (!filePath.startsWith(MUSIC_ROOT)) {
    throw new Error("Invalid path");
  }

  await fs.writeFile(filePath, buffer);

  const updated = {
    ...track,
    bucket: targetBucket,
    filename: safeName,
    isMissing: false,
  };

  catalog[idx] = updated;
  await writeJsonFile(DATA_FILES.catalog, catalog);

  return updated;
}

function resolveTrackFilePath(track) {
  if (!track?.bucket || !track?.filename) return null;
  assertValidBucket(track.bucket);
  const safeName = path.basename(track.filename);
  const filePath = path.join(MUSIC_ROOT, track.bucket, "analyzed", safeName);
  if (!filePath.startsWith(MUSIC_ROOT)) return null;
  return filePath;
}

export async function deleteTrackFromCatalog(trackId) {
  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  const idx = catalog.findIndex((t) => t.id === trackId);
  if (idx === -1) {
    throw new Error("Track not found");
  }

  const track = catalog[idx];
  let fileDeleted = false;

  const filePath = resolveTrackFilePath(track);
  if (filePath) {
    try {
      await fs.unlink(filePath);
      fileDeleted = true;
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw new Error(err.message || "Failed to delete audio file");
      }
    }
  }

  catalog.splice(idx, 1);
  await writeJsonFile(DATA_FILES.catalog, catalog);

  return { id: trackId, fileDeleted };
}
