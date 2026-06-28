import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { DEFAULT_FORM_SCHEMA } from "../src/lib/defaultFormSchema.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dest = path.join(ROOT, "storage-bootstrap", "data");

await fs.rm(path.join(ROOT, "storage-bootstrap"), { recursive: true, force: true });
await fs.mkdir(dest, { recursive: true });

// Empty runtime data only — never copy from public/data (local dev catalog).
await fs.writeFile(path.join(dest, "catalog.json"), "[]\n", "utf8");
await fs.writeFile(path.join(dest, "clients.json"), "[]\n", "utf8");
await fs.writeFile(path.join(dest, "feedback.json"), "{}\n", "utf8");
await fs.writeFile(
  path.join(dest, "form-schema.json"),
  `${JSON.stringify(DEFAULT_FORM_SCHEMA, null, 2)}\n`,
  "utf8"
);

console.log("Prepared storage-bootstrap/data (empty catalog — Render disk is not overwritten)");
