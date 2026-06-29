import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { isAdminSession, parseRequestSession } from "./auth.js";
import { STORAGE_ROOT } from "./storagePaths.js";

function runTar(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("tar", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `tar failed (${code})`));
    });
  });
}

async function buildBackupArchive() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "kramer-backup-"));
  const outFile = path.join(tmpDir, `kramer-backup-${Date.now()}.tar.gz`);

  const entries = [];
  for (const name of ["data", "music"]) {
    const full = path.join(STORAGE_ROOT, name);
    if (fsSync.existsSync(full)) entries.push(name);
  }
  if (entries.length === 0) {
    throw new Error("No storage folders found to export");
  }

  await runTar(["-czf", outFile, "-C", STORAGE_ROOT, ...entries]);
  return { tmpDir, outFile };
}

export function createBackupApiMiddleware() {
  return (req, res, next) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== "/api/admin/backup-export" || req.method !== "POST") {
      next();
      return;
    }

    if (!isAdminSession(parseRequestSession(req))) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Admin access required" }));
      return;
    }

    buildBackupArchive()
      .then(async ({ tmpDir, outFile }) => {
        try {
          const data = await fs.readFile(outFile);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/gzip");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="kramer-backup-${new Date().toISOString().slice(0, 10)}.tar.gz"`
          );
          res.end(data);
        } finally {
          await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        }
      })
      .catch((err) => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: err.message || "Backup export failed" }));
      });
  };
}
