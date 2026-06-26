import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ANALYZE_CLI = path.join(PROJECT_ROOT, "public", "analyze_cli.py");

export async function downloadDropboxFile(dropboxPath, accessToken) {
  const res = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path: dropboxPath }),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Dropbox download failed (${res.status})`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const safeName = path.basename(dropboxPath).replace(/[^\w.\- ()[\]]+/g, "_");
  const tmpPath = path.join(os.tmpdir(), `dj-pool-${Date.now()}-${safeName}`);

  await fs.promises.writeFile(tmpPath, buffer);
  return tmpPath;
}

export function runPythonAnalyzer(filePath) {
  return new Promise((resolve, reject) => {
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const proc = spawn(pythonCmd, [ANALYZE_CLI, filePath], {
      cwd: path.join(PROJECT_ROOT, "public"),
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    proc.on("error", (err) => {
      reject(new Error(`Python not found — install Python + librosa: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `analyzer exited with code ${code}`));
        return;
      }

      try {
        const line = stdout.trim().split("\n").pop();
        resolve(JSON.parse(line));
      } catch (err) {
        reject(new Error(`Invalid analyzer output: ${stdout || err.message}`));
      }
    });
  });
}

export async function analyzeDropboxFile(dropboxPath, accessToken) {
  let tmpPath = null;
  try {
    tmpPath = await downloadDropboxFile(dropboxPath, accessToken);
    return await runPythonAnalyzer(tmpPath);
  } finally {
    if (tmpPath) {
      fs.promises.unlink(tmpPath).catch(() => {});
    }
  }
}

export function createDropboxAnalyzeMiddleware(getAccessToken) {
  return async (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method not allowed");
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const { path: dropboxPath, accessToken: clientToken } = JSON.parse(body || "{}");
        if (!dropboxPath) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "path required" }));
          return;
        }

        const accessToken = (await getAccessToken()) || clientToken;
        if (!accessToken) {
          res.statusCode = 503;
          res.end(JSON.stringify({ error: "No Dropbox access token available" }));
          return;
        }

        const cues = await analyzeDropboxFile(dropboxPath, accessToken);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(cues));
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  };
}
