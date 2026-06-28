import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");

const RENDER_DISK_PATH = "/var/data";

function resolveStorageRoot() {
  if (process.env.STORAGE_ROOT) {
    return path.resolve(process.env.STORAGE_ROOT);
  }
  // Render persistent disk default (mount path /var/data)
  if (process.env.RENDER && fsSync.existsSync(RENDER_DISK_PATH)) {
    return RENDER_DISK_PATH;
  }
  return path.join(ROOT, "public");
}

/** Persistent uploads + JSON (Render disk at /var/data, or local public/ in dev). */
export const STORAGE_ROOT = resolveStorageRoot();

export const MUSIC_ROOT = path.join(STORAGE_ROOT, "music");
export const DATA_DIR = path.join(STORAGE_ROOT, "data");

const BOOTSTRAP_ROOT = path.join(ROOT, "storage-bootstrap");

export async function ensureStorageDirs() {
  await fs.mkdir(MUSIC_ROOT, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyFileIfMissing(src, dest) {
  if (await fileExists(dest)) return false;
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
  return true;
}

async function seedDirectoryIfEmpty(seedDir, targetDir) {
  if (!(await fileExists(seedDir))) return 0;

  let copied = 0;
  const entries = await fs.readdir(seedDir, { withFileTypes: true });

  for (const entry of entries) {
    const src = path.join(seedDir, entry.name);
    const dest = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(dest, { recursive: true });
      copied += await seedDirectoryIfEmpty(src, dest);
      continue;
    }

    if (await copyFileIfMissing(src, dest)) {
      copied += 1;
    }
  }

  return copied;
}

/** First boot only — never overwrite existing disk data (e.g. Render /var/data). */
export async function seedStorageIfEmpty() {
  const catalogPath = path.join(DATA_DIR, "catalog.json");
  if (await fileExists(catalogPath)) {
    return 0;
  }

  const seedDataDir = path.join(BOOTSTRAP_ROOT, "data");
  const seedMusicDir = path.join(BOOTSTRAP_ROOT, "music");
  let copied = 0;

  if (await fileExists(seedDataDir)) {
    copied += await seedDirectoryIfEmpty(seedDataDir, DATA_DIR);
  } else if (!process.env.RENDER) {
    const localDataDir = path.join(ROOT, "public", "data");
    if (await fileExists(localDataDir)) {
      copied += await seedDirectoryIfEmpty(localDataDir, DATA_DIR);
    }
  }

  if (await fileExists(seedMusicDir)) {
    copied += await seedDirectoryIfEmpty(seedMusicDir, MUSIC_ROOT);
  }

  return copied;
}

export async function initStorage() {
  await ensureStorageDirs();
  const seeded = await seedStorageIfEmpty();
  const settingsPath = path.join(DATA_DIR, "app-settings.json");
  const seedSettings = path.join(BOOTSTRAP_ROOT, "data", "app-settings.json");
  if (!(await fileExists(settingsPath)) && (await fileExists(seedSettings))) {
    await copyFileIfMissing(seedSettings, settingsPath);
  }
  console.log(`Storage root: ${STORAGE_ROOT}`);
  if (seeded > 0) {
    console.log(`Seeded ${seeded} file(s) onto persistent storage`);
  }
}
