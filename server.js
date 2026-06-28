import { createServer } from "http";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createDataApiMiddleware } from "./server/dataStore.js";
import { createUploadMusicMiddleware } from "./server/uploadMusic.js";
import { createDropboxImportMiddleware } from "./server/dropboxImport.js";
import { createApiNotFoundMiddleware } from "./server/apiNotFound.js";
import { initStorage, STORAGE_ROOT } from "./server/storagePaths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".ico": "image/x-icon",
};

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith("/music/") || pathname.startsWith("/data/")) {
    const filePath = path.join(STORAGE_ROOT, pathname);
    if (filePath.startsWith(STORAGE_ROOT)) {
      try {
        const data = await readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
        if (ext === ".mp3") {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.setHeader("Accept-Ranges", "bytes");
        }
        res.end(data);
        return;
      } catch {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }
    }
  }

  if (pathname === "/") pathname = "/index.html";

  const filePath = path.join(DIST, pathname);
  if (!filePath.startsWith(DIST)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.end(data);
  } catch {
    try {
      const spa = await readFile(path.join(DIST, "index.html"));
      res.setHeader("Content-Type", "text/html");
      res.end(spa);
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  }
}

const dataApi = createDataApiMiddleware();
const uploadMusic = createUploadMusicMiddleware();
const dropboxImport = createDropboxImportMiddleware();
const apiNotFound = createApiNotFoundMiddleware();

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, storageRoot: STORAGE_ROOT }));
    return;
  }

  dataApi(req, res, () => {
    uploadMusic(req, res, () => {
      dropboxImport(req, res, () => {
        apiNotFound(req, res, () => {
          serveStatic(req, res);
        });
      });
    });
  });
});

await initStorage();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Kramer Music server running on port ${PORT}`);
});
