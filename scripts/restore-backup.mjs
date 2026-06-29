import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { spawn } from "child_process";

function usage() {
  console.log("Usage: node scripts/restore-backup.mjs <path-to-kramer-backup.tar.gz>");
}

function runTar(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("tar", args, { stdio: "inherit" });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar failed (${code})`));
    });
  });
}

const archivePath = process.argv[2];
if (!archivePath) {
  usage();
  process.exit(1);
}

const resolvedArchive = path.resolve(archivePath);
if (!fs.existsSync(resolvedArchive)) {
  console.error(`Archive not found: ${resolvedArchive}`);
  process.exit(1);
}

const targetRoot = process.env.STORAGE_ROOT
  ? path.resolve(process.env.STORAGE_ROOT)
  : path.resolve(process.cwd(), "public");

await fsPromises.mkdir(targetRoot, { recursive: true });

console.log(`Restoring backup into: ${targetRoot}`);
await runTar(["-xzf", resolvedArchive, "-C", targetRoot]);
console.log("Restore complete.");
