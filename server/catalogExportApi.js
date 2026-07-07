import path from "path";
import fs from "fs/promises";
import { createRequire } from "module";
import { ensureTrackVersions } from "../src/lib/trackVersions.js";
import { isAdminSession, parseRequestSession } from "./auth.js";
import { DATA_FILES, readJsonFile } from "./dataStore.js";
import { MUSIC_ROOT } from "./storagePaths.js";

const require = createRequire(import.meta.url);
const archiver = require("archiver");
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
  const safeCatalog = Array.isArray(catalog) ? catalog : [];
  const payload = { tracks: safeCatalog.map(toMigrationTrack) };
  const artworkMap = { tracks: safeCatalog.map(toArtworkMapEntry) };
  const files = [];
  const seen = new Set();

function toArtworkMapEntry(rawTrack) {
  const track = ensureTrackVersions(rawTrack);
  const artworkUrl = typeof track.artwork === "string" ? track.artwork.trim() : "";
  const artworkFilename = artworkUrl.startsWith("/data/artwork/")
    ? path.basename(artworkUrl)
    : "";

  return {
    trackId: track.id,
    title: track.title ?? "",
    artist: track.artist ?? "",
    genre: track.bucket ?? "",
    artworkUrl: artworkUrl || null,
    artworkFile: artworkFilename ? `artwork/${artworkFilename}` : null,
    versions: (track.versions || []).map((version) => ({
      versionId: version.id ?? "",
      dropType: version.drop ?? "",
      artworkFile: artworkFilename ? `artwork/${artworkFilename}` : null,
    })),
  };
}

  for (const entry of artworkMap.tracks) {
    const artworkFile = String(entry.artworkFile || "");
    if (!artworkFile) continue;
    const filename = path.basename(artworkFile);
    const src = path.join(MUSIC_ROOT, "..", "data", "artwork", filename);
    try {
      await fs.access(src);
      const zipName = `artwork/${filename}`;
      if (seen.has(zipName)) continue;
      seen.add(zipName);
      files.push({ src, zipName });
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }

  return { payload, artworkMap, files };
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
      .then(({ payload, artworkMap, files }) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="catalog-export-${new Date().toISOString().slice(0, 10)}.zip"`
        );
        const archive = new archiver.ZipArchive({ zlib: { level: 6 } });
        archive.on("error", (err) => {
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: err.message || "Catalog ZIP export failed" }));
          }
        });
        archive.pipe(res);
        archive.append(JSON.stringify(payload, null, 2), { name: "catalog-export.json" });
        archive.append(JSON.stringify(artworkMap, null, 2), { name: "artwork-map.json" });
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

