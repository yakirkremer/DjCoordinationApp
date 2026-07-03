import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { isAdminSession, parseRequestSession } from "./auth.js";
import { isUnderRoot, safePathUnderRoot } from "./pathSafety.js";
import { STORAGE_ROOT } from "./storagePaths.js";

const TEXT_PREVIEW_MAX_BYTES = 512 * 1024;
const TEXT_EXTENSIONS = new Set([
  ".json",
  ".html",
  ".htm",
  ".txt",
  ".md",
  ".csv",
  ".xml",
  ".svg",
  ".css",
  ".js",
  ".mjs",
  ".log",
]);

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function resolveStoragePath(relativePath) {
  const normalized = String(relativePath ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const filePath = safePathUnderRoot(STORAGE_ROOT, normalized);
  if (!filePath || !isUnderRoot(filePath, STORAGE_ROOT)) return null;
  return { relative: normalized, absolute: filePath };
}

function isTextPreviewable(filePath, size) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) && size <= TEXT_PREVIEW_MAX_BYTES;
}

async function listDirectory(relativeDir) {
  const resolved = resolveStoragePath(relativeDir);
  if (!resolved) {
    throw Object.assign(new Error("Invalid path"), { status: 403 });
  }

  let dirStat;
  try {
    dirStat = await fs.stat(resolved.absolute);
  } catch {
    throw Object.assign(new Error("Directory not found"), { status: 404 });
  }

  if (!dirStat.isDirectory()) {
    throw Object.assign(new Error("Not a directory"), { status: 400 });
  }

  const dirents = await fs.readdir(resolved.absolute, { withFileTypes: true });
  const entries = await Promise.all(
    dirents.map(async (entry) => {
      const entryRelative = resolved.relative
        ? `${resolved.relative}/${entry.name}`
        : entry.name;
      const entryAbsolute = path.join(resolved.absolute, entry.name);
      const stat = await fs.stat(entryAbsolute);
      return {
        name: entry.name,
        path: entryRelative.replace(/\\/g, "/"),
        type: stat.isDirectory() ? "dir" : "file",
        size: stat.isFile() ? stat.size : null,
        modifiedAt: stat.mtime.toISOString(),
      };
    })
  );

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return {
    storageRoot: STORAGE_ROOT,
    dir: resolved.relative,
    entries,
  };
}

async function readFilePreview(relativePath) {
  const resolved = resolveStoragePath(relativePath);
  if (!resolved) {
    throw Object.assign(new Error("Invalid path"), { status: 403 });
  }

  let fileStat;
  try {
    fileStat = await fs.stat(resolved.absolute);
  } catch {
    throw Object.assign(new Error("File not found"), { status: 404 });
  }

  if (!fileStat.isFile()) {
    throw Object.assign(new Error("Not a file"), { status: 400 });
  }

  const base = {
    path: resolved.relative,
    size: fileStat.size,
    modifiedAt: fileStat.mtime.toISOString(),
    extension: path.extname(resolved.absolute).toLowerCase(),
  };

  if (!isTextPreviewable(resolved.absolute, fileStat.size)) {
    return {
      ...base,
      encoding: "binary",
      previewable: false,
    };
  }

  const raw = await fs.readFile(resolved.absolute, "utf8");
  let content = raw;
  if (base.extension === ".json") {
    try {
      content = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      // keep raw text if JSON parse fails
    }
  }

  return {
    ...base,
    encoding: "utf8",
    previewable: true,
    content,
  };
}

function streamFileDownload(relativePath, res) {
  const resolved = resolveStoragePath(relativePath);
  if (!resolved) {
    sendJson(res, 403, { error: "Invalid path" });
    return Promise.resolve();
  }

  return fs
    .stat(resolved.absolute)
    .then((fileStat) => {
      if (!fileStat.isFile()) {
        sendJson(res, 400, { error: "Not a file" });
        return;
      }
      const filename = path.basename(resolved.absolute);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", fileStat.size);
      createReadStream(resolved.absolute).pipe(res);
    })
    .catch(() => {
      sendJson(res, 404, { error: "File not found" });
    });
}

export function createStorageBrowseApiMiddleware() {
  return (req, res, next) => {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/api/admin/storage")) {
      next();
      return;
    }

    if (!isAdminSession(parseRequestSession(req))) {
      sendJson(res, 403, { error: "Admin access required" });
      return;
    }

    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    if (url.pathname === "/api/admin/storage/download") {
      const filePath = url.searchParams.get("path") ?? "";
      streamFileDownload(filePath, res);
      return;
    }

    if (url.pathname === "/api/admin/storage/file") {
      const filePath = url.searchParams.get("path") ?? "";
      readFilePreview(filePath)
        .then((payload) => sendJson(res, 200, payload))
        .catch((err) => sendJson(res, err.status || 500, { error: err.message || "Read failed" }));
      return;
    }

    if (url.pathname === "/api/admin/storage") {
      const dir = url.searchParams.get("dir") ?? "";
      listDirectory(dir)
        .then((payload) => sendJson(res, 200, payload))
        .catch((err) => sendJson(res, err.status || 500, { error: err.message || "List failed" }));
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  };
}
