import { createServer } from "http";
import { createReadStream } from "fs";
import { readFile, stat } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createDataApiMiddleware } from "./server/dataStore.js";
import { createUploadMusicMiddleware } from "./server/uploadMusic.js";
import { createDropboxImportMiddleware } from "./server/dropboxImport.js";
import { createApiNotFoundMiddleware } from "./server/apiNotFound.js";
import { createArtworkApiMiddleware } from "./server/artworkApi.js";
import { createBackupApiMiddleware } from "./server/backupApi.js";
import { createAuthApiMiddleware } from "./server/authApi.js";
import { createContractApiMiddleware } from "./server/contractApi.js";
import { createMediaAuthMiddleware } from "./server/mediaAuth.js";
import { assertProductionSecrets } from "./server/auth.js";
import { safePathUnderRoot } from "./server/pathSafety.js";
import { initStorage, STORAGE_ROOT } from "./server/storagePaths.js";
import { ensureAllGenreDirs, readGenreList } from "./server/genreStorage.js";

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
  const pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith("/data/") && !pathname.startsWith("/data/artwork/")) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  if (pathname.startsWith("/music/") || pathname.startsWith("/data/artwork/")) {
    const filePath = safePathUnderRoot(STORAGE_ROOT, pathname);
    if (!filePath) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }
    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME[ext] || "application/octet-stream";

      const setFileHeaders = () => {
        res.setHeader("Content-Type", contentType);
        if (ext === ".mp3") {
          res.setHeader("Cache-Control", "private, max-age=3600");
          res.setHeader("Accept-Ranges", "bytes");
        }
      };

      if (req.method === "HEAD") {
        res.statusCode = 200;
        setFileHeaders();
        if (ext === ".mp3") {
          res.setHeader("Content-Length", fileStat.size);
        }
        res.end();
        return;
      }

      if (req.method === "GET" && ext === ".mp3" && req.headers.range) {
        const total = fileStat.size;
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (match) {
          let start = match[1] ? parseInt(match[1], 10) : 0;
          let end = match[2] ? parseInt(match[2], 10) : total - 1;
          if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
            res.statusCode = 416;
            res.setHeader("Content-Range", `bytes */${total}`);
            res.end();
            return;
          }
          end = Math.min(end, total - 1);
          res.statusCode = 206;
          setFileHeaders();
          res.setHeader("Content-Length", end - start + 1);
          res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
          createReadStream(filePath, { start, end }).pipe(res);
          return;
        }
      }

      const data = await readFile(filePath);
      setFileHeaders();
      res.end(data);
      return;
    } catch {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
  }

  let spaPath = pathname;
  if (spaPath === "/") spaPath = "/index.html";

  const filePath = path.join(DIST, spaPath);
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
const artworkApi = createArtworkApiMiddleware();
const backupApi = createBackupApiMiddleware();
const authApi = createAuthApiMiddleware();
const contractApi = createContractApiMiddleware();
const mediaAuth = createMediaAuthMiddleware();
const apiNotFound = createApiNotFoundMiddleware();

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  authApi(req, res, () => {
    contractApi(req, res, () => {
    dataApi(req, res, () => {
      uploadMusic(req, res, () => {
        dropboxImport(req, res, () => {
          artworkApi(req, res, () => {
            backupApi(req, res, () => {
              apiNotFound(req, res, () => {
                mediaAuth(req, res, () => {
                  serveStatic(req, res);
                });
              });
            });
          });
        });
      });
    });
    });
  });
});

await initStorage();
assertProductionSecrets();
try {
  const genres = await readGenreList();
  await ensureAllGenreDirs(genres);
} catch (err) {
  console.warn("Genre folder init:", err.message);
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`kremer Music server running on port ${PORT}`);
});
