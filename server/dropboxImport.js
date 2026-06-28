import { sendJson } from "./dataStore.js";
import { saveTrackToCatalog } from "./catalogMusic.js";

let cachedAccessToken = null;
let tokenExpiresAt = 0;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export async function refreshDropboxToken(env = process.env) {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  const refreshToken = env.DROPBOX_REFRESH_TOKEN;
  const clientId = env.VITE_DROPBOX_APP_KEY;

  if (!refreshToken || !clientId) return null;

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 14_400) * 1000;
  return cachedAccessToken;
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function resolveAccessToken(req, getAccessToken) {
  const clientToken = getBearerToken(req);
  if (clientToken) return clientToken;

  const serverToken = await getAccessToken();
  if (serverToken) return serverToken;

  return null;
}

async function dropboxApi(path, accessToken, body) {
  const res = await fetch(`https://api.dropboxapi.com/2${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Dropbox API error (${res.status})`);
  }

  return res.json();
}

async function downloadDropboxFile(dropboxPath, accessToken) {
  const res = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path: dropboxPath }),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Dropbox download failed (${res.status})`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer;
}

function normalizeListEntry(entry) {
  const dropboxPath = entry.path_display || entry.path_lower;
  if (entry[".tag"] === "folder") {
    return {
      name: entry.name,
      path: dropboxPath,
      isFolder: true,
      size: 0,
    };
  }

  return {
    name: entry.name,
    path: dropboxPath,
    isFolder: false,
    size: entry.size || 0,
    isMp3: entry.name?.toLowerCase().endsWith(".mp3"),
  };
}

async function listFolder(path, accessToken) {
  const folderPath = path || "";
  const data = await dropboxApi("/files/list_folder", accessToken, {
    path: folderPath,
    recursive: false,
    include_deleted: false,
  });

  const entries = (data.entries || []).map(normalizeListEntry);
  entries.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return {
    path: folderPath,
    entries,
    hasMore: Boolean(data.has_more),
    cursor: data.cursor || null,
  };
}

async function handleList(req, res, getAccessToken) {
  const accessToken = await resolveAccessToken(req, getAccessToken);
  if (!accessToken) {
    sendJson(res, 503, { error: "Dropbox not connected — connect in admin or set DROPBOX_REFRESH_TOKEN" });
    return;
  }

  const body = JSON.parse((await readBody(req)) || "{}");
  const result = await listFolder(body.path ?? "", accessToken);
  sendJson(res, 200, result);
}

async function handleImport(req, res, getAccessToken) {
  const accessToken = await resolveAccessToken(req, getAccessToken);
  if (!accessToken) {
    sendJson(res, 503, { error: "Dropbox not connected" });
    return;
  }

  const body = JSON.parse((await readBody(req)) || "{}");
  const { paths, bucket } = body;

  if (!Array.isArray(paths) || paths.length === 0) {
    sendJson(res, 400, { error: "paths array required" });
    return;
  }

  const imported = [];
  const errors = [];

  for (const dropboxPath of paths) {
    try {
      const filename = dropboxPath.split("/").pop();
      const buffer = await downloadDropboxFile(dropboxPath, accessToken);
      const track = await saveTrackToCatalog({
        bucket,
        filename,
        buffer,
        dropboxPath,
      });
      imported.push(track);
    } catch (err) {
      errors.push({ path: dropboxPath, error: err.message || "Import failed" });
    }
  }

  sendJson(res, 200, { imported, errors });
}

export function createDropboxImportMiddleware(getAccessToken = () => refreshDropboxToken()) {
  return (req, res, next) => {
    const url = new URL(req.url, "http://localhost");

    if (req.method !== "POST") {
      next();
      return;
    }

    if (url.pathname === "/api/dropbox/list") {
      handleList(req, res, getAccessToken).catch((err) => {
        console.error("Dropbox list failed:", err);
        sendJson(res, 500, { error: err.message || "List failed" });
      });
      return;
    }

    if (url.pathname === "/api/dropbox/import") {
      handleImport(req, res, getAccessToken).catch((err) => {
        console.error("Dropbox import failed:", err);
        sendJson(res, 500, { error: err.message || "Import failed" });
      });
      return;
    }

    next();
  };
}
