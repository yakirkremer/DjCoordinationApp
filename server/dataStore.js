import fs from "fs/promises";
import path from "path";
import { normalizeGenres } from "../src/lib/categories.js";
import { applyGenreSettings, ensureAllGenreDirs, readGenreList } from "./genreStorage.js";
import { isAdminSession, isAuthenticatedSession, parseRequestSession } from "./auth.js";
import { DATA_DIR } from "./storagePaths.js";

export { DATA_DIR };

export const DATA_FILES = {
  clients: "clients.json",
  formSchema: "form-schema.json",
  feedback: "feedback.json",
  catalog: "catalog.json",
  settings: "app-settings.json",
};

export async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJsonFile(filename, fallback) {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, filename), "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function writeJsonFile(filename, data) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmpPath, filePath);
}

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

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export async function handleDataApi(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith("/api/data/")) return false;

  const resource = url.pathname.slice("/api/data/".length);
  const session = parseRequestSession(req);

  try {
    if (resource === "clients") {
      if (req.method === "GET") {
        if (!isAdminSession(session)) {
          sendJson(res, 403, { error: "Admin access required" });
          return true;
        }
        const clients = await readJsonFile(DATA_FILES.clients, []);
        sendJson(res, 200, clients);
        return true;
      }
      if (req.method === "PUT") {
        if (!isAdminSession(session)) {
          sendJson(res, 403, { error: "Admin access required" });
          return true;
        }
        const body = JSON.parse(await readBody(req));
        if (!Array.isArray(body)) {
          sendJson(res, 400, { error: "Expected array" });
          return true;
        }
        await writeJsonFile(DATA_FILES.clients, body);
        sendJson(res, 200, { ok: true });
        return true;
      }
    }

    if (resource === "form-schema") {
      if (req.method === "GET") {
        if (!isAuthenticatedSession(session)) {
          sendJson(res, 401, { error: "Login required" });
          return true;
        }
        const schema = await readJsonFile(DATA_FILES.formSchema, null);
        sendJson(res, 200, schema);
        return true;
      }
      if (req.method === "PUT") {
        if (!isAdminSession(session)) {
          sendJson(res, 403, { error: "Admin access required" });
          return true;
        }
        const body = JSON.parse(await readBody(req));
        await writeJsonFile(DATA_FILES.formSchema, body);
        sendJson(res, 200, { ok: true });
        return true;
      }
    }

    if (resource === "feedback") {
      if (req.method === "GET") {
        const clientId = url.searchParams.get("clientId");
        const all = await readJsonFile(DATA_FILES.feedback, {});
        if (clientId) {
          if (
            !isAdminSession(session) &&
            !(session?.role === "client" && session.clientId === clientId)
          ) {
            sendJson(res, 403, { error: "Forbidden" });
            return true;
          }
          sendJson(res, 200, all[clientId] ?? null);
          return true;
        }
        if (!isAdminSession(session)) {
          sendJson(res, 403, { error: "Admin access required" });
          return true;
        }
        sendJson(res, 200, all);
        return true;
      }
      if (req.method === "PUT") {
        if (!isAuthenticatedSession(session)) {
          sendJson(res, 401, { error: "Login required" });
          return true;
        }
        const body = JSON.parse(await readBody(req));
        const { clientId, data } = body;
        if (!clientId) {
          sendJson(res, 400, { error: "clientId required" });
          return true;
        }
        if (!isAdminSession(session) && session.clientId !== clientId) {
          sendJson(res, 403, { error: "Forbidden" });
          return true;
        }
        const all = await readJsonFile(DATA_FILES.feedback, {});
        if (data == null) {
          delete all[clientId];
        } else {
          all[clientId] = data;
        }
        await writeJsonFile(DATA_FILES.feedback, all);
        sendJson(res, 200, { ok: true });
        return true;
      }
    }

    if (resource === "catalog") {
      if (req.method === "GET") {
        if (!isAuthenticatedSession(session)) {
          sendJson(res, 401, { error: "Login required" });
          return true;
        }
        const catalog = await readJsonFile(DATA_FILES.catalog, []);
        sendJson(res, 200, catalog);
        return true;
      }
      if (req.method === "PUT") {
        if (!isAdminSession(session)) {
          sendJson(res, 403, { error: "Admin access required" });
          return true;
        }
        const body = JSON.parse(await readBody(req));
        if (!Array.isArray(body)) {
          sendJson(res, 400, { error: "Expected array" });
          return true;
        }
        await writeJsonFile(DATA_FILES.catalog, body);
        sendJson(res, 200, { ok: true });
        return true;
      }
    }

    if (resource === "settings") {
      if (req.method === "GET") {
        if (!isAuthenticatedSession(session)) {
          sendJson(res, 401, { error: "Login required" });
          return true;
        }
        const settings = await readJsonFile(DATA_FILES.settings, null);
        sendJson(res, 200, settings);
        return true;
      }
      if (req.method === "PUT") {
        if (!isAdminSession(session)) {
          sendJson(res, 403, { error: "Admin access required" });
          return true;
        }
        const body = JSON.parse(await readBody(req));
        const { genreRenames, genreRemoved, ...settingsBody } = body;

        if (Array.isArray(settingsBody.genres)) {
          await applyGenreSettings({
            genres: settingsBody.genres,
            renames: Array.isArray(genreRenames) ? genreRenames : [],
            removed: Array.isArray(genreRemoved) ? genreRemoved : [],
          });
          settingsBody.genres = normalizeGenres(settingsBody.genres);
        }

        await writeJsonFile(DATA_FILES.settings, settingsBody);
        sendJson(res, 200, { ok: true, settings: settingsBody });
        return true;
      }
    }

    sendJson(res, 404, { error: "Not found" });
    return true;
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Server error" });
    return true;
  }
}

export function createDataApiMiddleware() {
  return (req, res, next) => {
    handleDataApi(req, res).then((handled) => {
      if (!handled) next();
    });
  };
}
