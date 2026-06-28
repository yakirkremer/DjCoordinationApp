import fs from "fs/promises";
import path from "path";
import { normalizeGenres, sanitizeGenreName } from "../src/lib/categories.js";
import { readJsonFile, writeJsonFile, DATA_FILES } from "./dataStore.js";
import { MUSIC_ROOT } from "./storagePaths.js";

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

let cachedGenres = null;

export async function readGenreList() {
  const settings = await readJsonFile(DATA_FILES.settings, {});
  cachedGenres = normalizeGenres(settings?.genres);
  return cachedGenres;
}

export function getCachedGenres() {
  return cachedGenres || normalizeGenres();
}

export async function ensureGenreDir(genre) {
  const name = sanitizeGenreName(genre);
  if (!name) throw new Error("Invalid genre name");

  const analyzedDir = path.join(MUSIC_ROOT, name, "analyzed");
  await fs.mkdir(analyzedDir, { recursive: true });

  const resolved = path.resolve(analyzedDir);
  const musicRoot = path.resolve(MUSIC_ROOT);
  if (!resolved.startsWith(musicRoot)) {
    throw new Error("Invalid genre path");
  }

  return analyzedDir;
}

export async function ensureAllGenreDirs(genres) {
  const list = normalizeGenres(genres);
  for (const genre of list) {
    await ensureGenreDir(genre);
  }
  return list;
}

async function renameGenreDir(from, to) {
  const oldName = sanitizeGenreName(from);
  const newName = sanitizeGenreName(to);
  if (!oldName || !newName || oldName === newName) return;

  const oldPath = path.join(MUSIC_ROOT, oldName);
  const newPath = path.join(MUSIC_ROOT, newName);

  if (!(await fileExists(oldPath))) {
    await ensureGenreDir(newName);
    return;
  }

  if (await fileExists(newPath)) {
    throw new Error(`Genre folder "${newName}" already exists`);
  }

  await fs.rename(oldPath, newPath);
}

async function updateCatalogBuckets(from, to) {
  const oldName = sanitizeGenreName(from);
  const newName = sanitizeGenreName(to);
  if (!oldName || !newName || oldName === newName) return 0;

  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  let changed = 0;

  for (const track of catalog) {
    if (track.bucket === oldName) {
      track.bucket = newName;
      changed += 1;
    }
  }

  if (changed > 0) {
    await writeJsonFile(DATA_FILES.catalog, catalog);
  }

  return changed;
}

async function countTracksInGenre(genre) {
  const name = sanitizeGenreName(genre);
  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  return catalog.filter((t) => t.bucket === name).length;
}

/**
 * Apply genre list changes: rename folders, update catalog, create new dirs.
 */
export async function applyGenreSettings({ genres, renames = [], removed = [] }) {
  const nextGenres = normalizeGenres(genres);
  const prevGenres = await readGenreList();

  for (const name of removed) {
    const count = await countTracksInGenre(name);
    if (count > 0) {
      throw new Error(`Cannot remove genre "${name}" — ${count} track(s) still use it`);
    }
  }

  for (const { from, to } of renames) {
    await renameGenreDir(from, to);
    await updateCatalogBuckets(from, to);
  }

  for (const genre of nextGenres) {
    if (!prevGenres.includes(genre)) {
      await ensureGenreDir(genre);
    }
  }

  // After renames, ensure all current genres have folders
  await ensureAllGenreDirs(nextGenres);

  cachedGenres = nextGenres;
  return nextGenres;
}

export async function assertValidGenre(bucket) {
  const genres = cachedGenres ?? (await readGenreList());
  if (!bucket || !genres.includes(bucket)) {
    throw new Error("Invalid category");
  }
}
