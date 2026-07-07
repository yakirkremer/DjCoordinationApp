import path from "path";
import fs from "fs/promises";
import * as archiverPkg from "archiver";
import { ensureTrackVersions } from "../src/lib/trackVersions.js";
import { isAdminSession, parseRequestSession } from "./auth.js";
import { DATA_FILES, readJsonFile } from "./dataStore.js";
import { MUSIC_ROOT } from "./storagePaths.js";

const archiver = archiverPkg.default ?? archiverPkg;

function toMigrationTrack(rawTrack) {
  const track = ensureTrackVersions(rawTrack);
  return {
    trackId: track.id,
    title: track.title ?? "",
    artist: track.artist ?? "",
    genre: track.bucket ?? "",
    versions: (track.versions || [])
      .filter((version) => version?.filename)
      .map((version) => ({
        dropType: version.drop ?? "",
        file: `audio/${track.bucket}/${version.filename}`,
        startCue: Number.isFinite(Number(version.startTime)) ? Number(version.startTime) : 0,
        endCue: Number.isFinite(Number(version.endTime)) ? Number(version.endTime) : 0,
      })),
  };
}

async function buildCatalogExportData() {
  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  const payload = { tracks: (Array.isArray(catalog) ? catalog : []).map(toMigrationTrack) };
  const files = [];
  const seen = new Set();

  for (const track of payload.tracks) {
    for (const version of track.versions) {
      const rel = String(version.file || "").replace(/^audio\//, "");
      if (!rel) continue;
      const [bucket, ...nameParts] = rel.split("/");
      const filename = nameParts.join("/");
      if (!bucket || !filename) continue;

      const base = path.basename(filename);
      const src = path.join(MUSIC_ROOT, bucket, "analyzed", base);
      const zipName = `audio/${bucket}/${base}`;
      if (seen.has(zipName)) continue;
      try {
        await fs.access(src);
        seen.add(zipName);
        files.push({ src, zipName });
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
      }
    }
  }

  return { payload, files };
}

export function createCatalogExportApiMiddleware() {
  return (req, res, next) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== "/api/admin/catalog-export-zip" || req.method !== "POST") {
      next();
      return;
    }

    if (!isAdminSession(parseRequestSession(req))) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Admin access required" }));
      return;
    }

    buildCatalogExportData()
      .then(({ payload, files }) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="catalog-export-${new Date().toISOString().slice(0, 10)}.zip"`
        );
        const archive = archiver("zip", { zlib: { level: 6 } });
        archive.on("error", (err) => {
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: err.message || "Catalog ZIP export failed" }));
          }
        });
        archive.pipe(res);
        archive.append(JSON.stringify(payload, null, 2), { name: "catalog-export.json" });
        for (const file of files) {
          archive.file(file.src, { name: file.zipName });
        }
        archive.finalize();
      })
      .catch((err) => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: err.message || "Catalog ZIP export failed" }));
      });
  };
}

