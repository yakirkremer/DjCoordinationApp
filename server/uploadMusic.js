import { parseMultipart, readRequestBody } from "./parseMultipart.js";
import { sendJson } from "./dataStore.js";
import { saveTrackToCatalog, reloadTrackFile, deleteTrackFromCatalog } from "./catalogMusic.js";

export async function handleMusicUpload(req, res) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(.+)$/i);
  if (!boundaryMatch) {
    sendJson(res, 400, { error: "Expected multipart form data" });
    return;
  }

  let buffer;
  try {
    buffer = await readRequestBody(req);
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

  try {
    const track = await saveTrackToCatalog({
      bucket: fields.bucket,
      filename: filePart.filename || "track.mp3",
      buffer: filePart.data,
      title: fields.title,
      artist: fields.artist,
    });
    sendJson(res, 201, { track });
  } catch (err) {
    sendJson(res, 400, { error: err.message || "Upload failed" });
  }
}

export async function handleMusicReload(req, res) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(.+)$/i);
  if (!boundaryMatch) {
    sendJson(res, 400, { error: "Expected multipart form data" });
    return;
  }

  let buffer;
  try {
    buffer = await readRequestBody(req);
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

  if (!fields.trackId) {
    sendJson(res, 400, { error: "Missing track id" });
    return;
  }

  if (!filePart?.data?.length) {
    sendJson(res, 400, { error: "No audio file provided" });
    return;
  }

  try {
    const track = await reloadTrackFile({
      trackId: fields.trackId,
      bucket: fields.bucket,
      filename: fields.filename,
      buffer: filePart.data,
    });
    sendJson(res, 200, { track });
  } catch (err) {
    sendJson(res, 400, { error: err.message || "Reload failed" });
  }
}

export async function handleMusicDelete(req, res) {
  let body;
  try {
    const raw = await readRequestBody(req, 4096);
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    sendJson(res, 400, { error: "Invalid request body" });
    return;
  }

  if (!body.trackId) {
    sendJson(res, 400, { error: "Missing track id" });
    return;
  }

  try {
    const result = await deleteTrackFromCatalog(body.trackId);
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 400, { error: err.message || "Delete failed" });
  }
}

export function createUploadMusicMiddleware() {
  return (req, res, next) => {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "POST" && url.pathname === "/api/music/upload") {
      handleMusicUpload(req, res).catch((err) => {
        console.error("Upload failed:", err);
        sendJson(res, 500, { error: err.message || "Upload failed" });
      });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/music/reload") {
      handleMusicReload(req, res).catch((err) => {
        console.error("Reload failed:", err);
        sendJson(res, 500, { error: err.message || "Reload failed" });
      });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/music/delete") {
      handleMusicDelete(req, res).catch((err) => {
        console.error("Delete failed:", err);
        sendJson(res, 500, { error: err.message || "Delete failed" });
      });
      return;
    }
    next();
  };
}
