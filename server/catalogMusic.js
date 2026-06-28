import fs from "fs/promises";
import path from "path";
import { OFFICIAL_CATEGORIES } from "../src/lib/categories.js";
import { readJsonFile, writeJsonFile, DATA_FILES } from "./dataStore.js";
import { MUSIC_ROOT } from "./storagePaths.js";
import { isSupportedAudioFilename, prepareUploadAudio, toCatalogMp3Filename } from "./transcodeAudio.js";

export { MUSIC_ROOT };
export const MAX_MUSIC_BYTES = 80 * 1024 * 1024;

export function sanitizeFilename(name) {
  const base = path.basename(name).replace(/[<>:"|?*\x00-\x1f]/g, "_").trim();
  if (!isSupportedAudioFilename(base)) {
    throw new Error("Only .mp3 and .wav files are supported");
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

  const prepared = await prepareUploadAudio(buffer, safeName);
  buffer = prepared.buffer;
  safeName = toCatalogMp3Filename(prepared.filename);

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

  const oldFilePath = resolveTrackFilePath(track);

  const prepared = await prepareUploadAudio(buffer, safeName);
  buffer = prepared.buffer;
  safeName = toCatalogMp3Filename(prepared.filename);

  const analyzedDir = path.join(MUSIC_ROOT, targetBucket, "analyzed");
  await fs.mkdir(analyzedDir, { recursive: true });

  const filePath = path.join(analyzedDir, safeName);
  if (!filePath.startsWith(MUSIC_ROOT)) {
    throw new Error("Invalid path");
  }

  await fs.writeFile(filePath, buffer);

  if (oldFilePath && oldFilePath !== filePath) {
    await fs.unlink(oldFilePath).catch((err) => {
      if (err.code !== "ENOENT") throw err;
    });
  }

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

function sanitizeCatalogFilename(name) {
  const base = path.basename(name).replace(/[<>:"|?*\x00-\x1f]/g, "_").trim();
  if (!base.toLowerCase().endsWith(".mp3")) {
    throw new Error("Catalog filename must end with .mp3");
  }
  return base;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function moveTrackAudioFile(oldTrack, nextTrack) {
  const oldPath = resolveTrackFilePath(oldTrack);
  assertValidBucket(nextTrack.bucket);

  const newDir = path.join(MUSIC_ROOT, nextTrack.bucket, "analyzed");
  await fs.mkdir(newDir, { recursive: true });

  let targetName = path.basename(nextTrack.filename);
  let newPath = path.join(newDir, targetName);

  if (oldPath && oldPath === newPath) {
    return targetName;
  }

  if (!oldPath || !(await fileExists(oldPath))) {
    return targetName;
  }

  if (await fileExists(newPath) && oldPath !== newPath) {
    targetName = await uniqueFilename(newDir, targetName);
    newPath = path.join(newDir, targetName);
  }

  try {
    await fs.rename(oldPath, newPath);
  } catch (err) {
    if (err.code === "EXDEV") {
      await fs.copyFile(oldPath, newPath);
      await fs.unlink(oldPath);
    } else {
      throw err;
    }
  }

  return targetName;
}

export async function updateTrackInCatalog(trackId, updates) {
  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  const idx = catalog.findIndex((t) => t.id === trackId);
  if (idx === -1) {
    throw new Error("Track not found");
  }

  const track = catalog[idx];
  const patch = {};

  if (updates.title !== undefined) patch.title = String(updates.title).trim() || track.title;
  if (updates.artist !== undefined) patch.artist = String(updates.artist).trim() || track.artist;
  if (updates.bucket !== undefined) {
    assertValidBucket(updates.bucket);
    patch.bucket = updates.bucket;
  }
  if (updates.filename !== undefined) {
    patch.filename = sanitizeCatalogFilename(updates.filename);
  }
  if (updates.startTime !== undefined) {
    patch.startTime = parseInt(updates.startTime, 10) || 0;
  }
  if (updates.endTime !== undefined) {
    patch.endTime = parseInt(updates.endTime, 10) || 0;
  }

  const next = { ...track, ...patch };
  const finalFilename = await moveTrackAudioFile(track, next);
  next.filename = finalFilename;

  const onDisk = await fileExists(resolveTrackFilePath(next));
  next.isMissing = !onDisk;

  catalog[idx] = next;
  await writeJsonFile(DATA_FILES.catalog, catalog);

  return next;
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
