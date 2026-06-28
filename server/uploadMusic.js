import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { OFFICIAL_CATEGORIES } from "../src/lib/categories.js";
import { readJsonFile, writeJsonFile, DATA_FILES, sendJson } from "./dataStore.js";
import { parseMultipart, readRequestBody } from "./parseMultipart.js";

const ROOT = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const MUSIC_ROOT = path.join(ROOT, "public", "music");
const MAX_UPLOAD_BYTES = 80 * 1024 * 1024;

function sanitizeFilename(name) {
  const base = path.basename(name).replace(/[<>:"|?*\x00-\x1f]/g, "_").trim();
  if (!base.toLowerCase().endsWith(".mp3")) {
    throw new Error("Only .mp3 files are supported");
  }
  return base;
}

async function uniqueFilename(dir, filename) {
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

function parseFilenameMeta(filename) {
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

function generateTrackId() {
  return `track_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function handleMusicUpload(req, res) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(.+)$/i);
  if (!boundaryMatch) {
    sendJson(res, 400, { error: "Expected multipart form data" });
    return;
  }

  let buffer;
  try {
    buffer = await readRequestBody(req, MAX_UPLOAD_BYTES);
  } catch (err) {
    sendJson(res, 413, { error: err.message || "Upload too large" });
    return;
  }

  const parts = parseMultipart(buffer, boundaryMatch[1].trim());
  const fields = {};
  let filePart = null;

  for (const part of parts) {
    if (!part.name) continue;
    if (part.filename) {
      filePart = part;
    } else {
      fields[part.name] = part.data.toString("utf8").trim();
    }
  }

  if (!filePart?.data?.length) {
    sendJson(res, 400, { error: "No audio file provided" });
    return;
  }

  const bucket = fields.bucket;
  if (!bucket || !OFFICIAL_CATEGORIES.includes(bucket)) {
    sendJson(res, 400, { error: "Invalid category" });
    return;
  }

  let filename;
  try {
    filename = sanitizeFilename(filePart.filename || "track.mp3");
  } catch (err) {
    sendJson(res, 400, { error: err.message });
    return;
  }

  const analyzedDir = path.join(MUSIC_ROOT, bucket, "analyzed");
  await fs.mkdir(analyzedDir, { recursive: true });
  filename = await uniqueFilename(analyzedDir, filename);

  const filePath = path.join(analyzedDir, filename);
  if (!filePath.startsWith(MUSIC_ROOT)) {
    sendJson(res, 400, { error: "Invalid path" });
    return;
  }

  await fs.writeFile(filePath, filePart.data);

  const meta = parseFilenameMeta(filename);
  const title = fields.title || meta.title;
  const artist = fields.artist || meta.artist;

  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  const newTrack = {
    id: generateTrackId(),
    title,
    artist,
    bucket,
    filename,
    startTime: 30,
    endTime: 90,
    isMissing: false,
  };

  catalog.push(newTrack);
  await writeJsonFile(DATA_FILES.catalog, catalog);

  sendJson(res, 201, { track: newTrack });
}

export function createUploadMusicMiddleware() {
  return (req, res, next) => {
    const url = new URL(req.url, "http://localhost");
    if (req.method !== "POST" || url.pathname !== "/api/music/upload") {
      next();
      return;
    }

    handleMusicUpload(req, res).catch((err) => {
      console.error("Upload failed:", err);
      sendJson(res, 500, { error: err.message || "Upload failed" });
    });
  };
}
