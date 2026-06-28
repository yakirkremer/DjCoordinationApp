import fs from "fs/promises";
import path from "path";
import { OFFICIAL_CATEGORIES } from "../src/lib/categories.js";
import {
  ensureTrackVersions,
  generateVersionId,
  syncFlatFromVersions,
} from "../src/lib/trackVersions.js";
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

function resolveVersionFilePath(track, version) {
  if (!track?.bucket || !version?.filename) return null;
  assertValidBucket(track.bucket);
  const safeName = path.basename(version.filename);
  const filePath = path.join(MUSIC_ROOT, track.bucket, "analyzed", safeName);
  if (!filePath.startsWith(MUSIC_ROOT)) return null;
  return filePath;
}

async function writeAudioToBucket(bucket, safeName, buffer) {
  const analyzedDir = path.join(MUSIC_ROOT, bucket, "analyzed");
  await fs.mkdir(analyzedDir, { recursive: true });
  safeName = await uniqueFilename(analyzedDir, safeName);
  const filePath = path.join(analyzedDir, safeName);
  if (!filePath.startsWith(MUSIC_ROOT)) {
    throw new Error("Invalid path");
  }
  await fs.writeFile(filePath, buffer);
  return safeName;
}

async function moveVersionFile(track, version, nextBucket, nextFilename) {
  const oldPath = resolveVersionFilePath(track, version);
  const newDir = path.join(MUSIC_ROOT, nextBucket, "analyzed");
  await fs.mkdir(newDir, { recursive: true });

  let targetName = path.basename(nextFilename);
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

async function setVersionMissingFlags(track) {
  const versions = await Promise.all(
    track.versions.map(async (version) => {
      const onDisk = await fileExists(resolveVersionFilePath(track, version));
      return { ...version, isMissing: !onDisk };
    })
  );
  return syncFlatFromVersions({ ...track, versions });
}

function catalogTrackResponse(track) {
  return syncFlatFromVersions(ensureTrackVersions(track));
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
  safeName = await writeAudioToBucket(bucket, safeName, buffer);

  const meta = parseFilenameMeta(safeName);
  const versionId = generateVersionId();
  const version = {
    id: versionId,
    drop: "",
    filename: safeName,
    startTime: 30,
    endTime: 90,
    ...(dropboxPath ? { dropboxSourcePath: dropboxPath } : {}),
  };

  const newTrack = {
    id: generateTrackId(),
    title: title?.trim() || meta.title,
    artist: artist?.trim() || meta.artist,
    bucket,
    versions: [version],
    defaultVersionId: versionId,
  };

  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  catalog.push(newTrack);
  await writeJsonFile(DATA_FILES.catalog, catalog);

  return catalogTrackResponse(await setVersionMissingFlags(newTrack));
}

export async function addVersionToTrack({ trackId, buffer, filename, drop }) {
  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  const idx = catalog.findIndex((t) => t.id === trackId);
  if (idx === -1) throw new Error("Track not found");

  let track = ensureTrackVersions(catalog[idx]);

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
  safeName = await writeAudioToBucket(track.bucket, safeName, buffer);

  if (!drop?.trim()) {
    throw new Error("Drop type is required");
  }

  const dropLabel = drop.trim();
  const duplicate = track.versions.find(
    (v) => String(v.drop || "").trim().toLowerCase() === dropLabel.toLowerCase()
  );
  if (duplicate) {
    throw new Error("This track already has a version with this drop type");
  }

  const versionId = generateVersionId();
  const version = {
    id: versionId,
    drop: dropLabel,
    filename: safeName,
    startTime: 30,
    endTime: 90,
  };

  track = {
    ...track,
    versions: [...track.versions, version],
  };

  catalog[idx] = track;
  await writeJsonFile(DATA_FILES.catalog, catalog);

  return catalogTrackResponse(await setVersionMissingFlags(track));
}

export async function reloadTrackFile({ trackId, versionId, bucket, filename, buffer }) {
  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  const idx = catalog.findIndex((t) => t.id === trackId);
  if (idx === -1) throw new Error("Track not found");

  let track = ensureTrackVersions(catalog[idx]);
  const targetBucket = bucket || track.bucket;
  assertValidBucket(targetBucket);

  const version = versionId
    ? track.versions.find((v) => v.id === versionId)
    : track.versions.find((v) => v.id === track.defaultVersionId) || track.versions[0];

  if (!version) throw new Error("Version not found");

  let safeName;
  try {
    safeName = sanitizeFilename(filename || version.filename);
  } catch (err) {
    throw new Error(err.message);
  }

  if (buffer.length > MAX_MUSIC_BYTES) {
    throw new Error(`File too large (max ${Math.floor(MAX_MUSIC_BYTES / 1024 / 1024)}MB)`);
  }

  const oldPath = resolveVersionFilePath({ ...track, bucket: targetBucket }, version);

  const prepared = await prepareUploadAudio(buffer, safeName);
  buffer = prepared.buffer;
  safeName = toCatalogMp3Filename(prepared.filename);

  const analyzedDir = path.join(MUSIC_ROOT, targetBucket, "analyzed");
  await fs.mkdir(analyzedDir, { recursive: true });
  const filePath = path.join(analyzedDir, safeName);
  if (!filePath.startsWith(MUSIC_ROOT)) throw new Error("Invalid path");

  await fs.writeFile(filePath, buffer);

  if (oldPath && oldPath !== filePath) {
    await fs.unlink(oldPath).catch((err) => {
      if (err.code !== "ENOENT") throw err;
    });
  }

  const versions = track.versions.map((v) =>
    v.id === version.id ? { ...v, filename: safeName } : v
  );

  track = { ...track, bucket: targetBucket, versions };
  catalog[idx] = track;
  await writeJsonFile(DATA_FILES.catalog, catalog);

  return catalogTrackResponse(await setVersionMissingFlags(track));
}

export async function updateTrackInCatalog(trackId, updates, versionId) {
  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  const idx = catalog.findIndex((t) => t.id === trackId);
  if (idx === -1) throw new Error("Track not found");

  let track = ensureTrackVersions(catalog[idx]);

  if (versionId) {
    const vIdx = track.versions.findIndex((v) => v.id === versionId);
    if (vIdx === -1) throw new Error("Version not found");

    const version = { ...track.versions[vIdx] };
    if (updates.drop !== undefined) version.drop = String(updates.drop).trim();
    if (updates.startTime !== undefined) {
      version.startTime = parseInt(updates.startTime, 10) || 0;
    }
    if (updates.endTime !== undefined) {
      version.endTime = parseInt(updates.endTime, 10) || 0;
    }
    if (updates.filename !== undefined) {
      version.filename = sanitizeCatalogFilename(updates.filename);
      version.filename = await moveVersionFile(track, version, track.bucket, version.filename);
    }

    const versions = [...track.versions];
    versions[vIdx] = version;
    track = { ...track, versions };

    if (updates.defaultVersion) {
      track.defaultVersionId = versionId;
    }
  } else {
    if (updates.title !== undefined) track.title = String(updates.title).trim() || track.title;
    if (updates.artist !== undefined) track.artist = String(updates.artist).trim() || track.artist;

    if (updates.bucket !== undefined) {
      assertValidBucket(updates.bucket);
      const nextBucket = updates.bucket;
      if (nextBucket !== track.bucket) {
        const movedVersions = [];
        for (const version of track.versions) {
          const movedName = await moveVersionFile(track, version, nextBucket, version.filename);
          movedVersions.push({ ...version, filename: movedName });
        }
        track = { ...track, bucket: nextBucket, versions: movedVersions };
      }
    }
  }

  catalog[idx] = track;
  await writeJsonFile(DATA_FILES.catalog, catalog);

  return catalogTrackResponse(await setVersionMissingFlags(track));
}

export async function deleteVersionFromCatalog(trackId, versionId) {
  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  const idx = catalog.findIndex((t) => t.id === trackId);
  if (idx === -1) throw new Error("Track not found");

  let track = ensureTrackVersions(catalog[idx]);
  if (track.versions.length <= 1) {
    throw new Error("Cannot delete the only version — delete the track instead");
  }

  const version = track.versions.find((v) => v.id === versionId);
  if (!version) throw new Error("Version not found");

  const filePath = resolveVersionFilePath(track, version);
  if (filePath) {
    await fs.unlink(filePath).catch((err) => {
      if (err.code !== "ENOENT") throw err;
    });
  }

  const versions = track.versions.filter((v) => v.id !== versionId);
  let defaultVersionId = track.defaultVersionId;
  if (defaultVersionId === versionId) {
    defaultVersionId = versions[0].id;
  }

  track = { ...track, versions, defaultVersionId };
  catalog[idx] = track;
  await writeJsonFile(DATA_FILES.catalog, catalog);

  return catalogTrackResponse(await setVersionMissingFlags(track));
}

export async function deleteTrackFromCatalog(trackId) {
  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  const idx = catalog.findIndex((t) => t.id === trackId);
  if (idx === -1) throw new Error("Track not found");

  const track = ensureTrackVersions(catalog[idx]);
  let fileDeleted = false;

  for (const version of track.versions) {
    const filePath = resolveVersionFilePath(track, version);
    if (!filePath) continue;
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
