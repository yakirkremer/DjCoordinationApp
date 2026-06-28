import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function copyTree(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyTree(from, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
}

const dataSrc = path.join(ROOT, "public", "data");
const dataDest = path.join(ROOT, "storage-bootstrap", "data");

await fs.rm(path.join(ROOT, "storage-bootstrap"), { recursive: true, force: true });
await copyTree(dataSrc, dataDest);
console.log("Prepared storage-bootstrap/data for deploy");
