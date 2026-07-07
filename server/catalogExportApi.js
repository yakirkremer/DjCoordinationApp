import fs from "fs/promises";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { ensureTrackVersions } from "../src/lib/trackVersions.js";
import { isAdminSession, parseRequestSession } from "./auth.js";
import { DATA_FILES, readJsonFile } from "./dataStore.js";
import { MUSIC_ROOT } from "./storagePaths.js";

function runZip(args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn("zip", args, {
      cwd,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `zip failed (${code})`));
    });
  });
}

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

async function buildCatalogExportZip() {
  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  const payload = { tracks: (Array.isArray(catalog) ? catalog : []).map(toMigrationTrack) };

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "kremer-catalog-export-"));
  const exportDir = path.join(tmpDir, "export");
  const audioDir = path.join(exportDir, "audio");
  const zipPath = path.join(tmpDir, `catalog-export-${Date.now()}.zip`);

  await fs.mkdir(audioDir, { recursive: true });
  await fs.writeFile(
    path.join(exportDir, "catalog-export.json"),
    JSON.stringify(payload, null, 2),
    "utf8"
  );

  for (const track of payload.tracks) {
    for (const version of track.versions) {
      const rel = String(version.file || "").replace(/^audio\//, "");
      if (!rel) continue;
      const [bucket, ...nameParts] = rel.split("/");
      const filename = nameParts.join("/");
      if (!bucket || !filename) continue;

      const src = path.join(MUSIC_ROOT, bucket, "analyzed", path.basename(filename));
      const dest = path.join(audioDir, bucket, path.basename(filename));
      await fs.mkdir(path.dirname(dest), { recursive: true });
      try {
        await fs.copyFile(src, dest);
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
      }
    }
  }

  await runZip(["-qr", zipPath, "."], exportDir);
  return { tmpDir, zipPath };
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

    buildCatalogExportZip()
      .then(async ({ tmpDir, zipPath }) => {
        try {
          const data = await fs.readFile(zipPath);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/zip");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="catalog-export-${new Date().toISOString().slice(0, 10)}.zip"`
          );
          res.end(data);
        } finally {
          await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        }
      })
      .catch((err) => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: err.message || "Catalog ZIP export failed" }));
      });
  };
}

