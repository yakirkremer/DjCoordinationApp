import { createDropboxAnalyzeMiddleware } from "./dropboxAnalyze.js";

let cachedAccessToken = null;
let tokenExpiresAt = 0;
const temporaryLinkCache = new Map();

function getCachedTemporaryLink(dropboxPath) {
  const cached = temporaryLinkCache.get(dropboxPath);
  if (!cached) return null;
  if (Date.now() >= cached.expiresAt - 60_000) {
    temporaryLinkCache.delete(dropboxPath);
    return null;
  }
  return cached.link;
}

function setCachedTemporaryLink(dropboxPath, link, expiresAt) {
  temporaryLinkCache.set(dropboxPath, { link, expiresAt });
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

export function createDropboxApiMiddleware(getAccessToken = () => refreshDropboxToken()) {
  const analyzeHandler = createDropboxAnalyzeMiddleware(getAccessToken);

  return async (req, res, next) => {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/api/dropbox/temporary-link") {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.end("Method not allowed");
        return;
      }

      try {
        const body = await readBody(req);
        const { path: dropboxPath } = JSON.parse(body || "{}");
        if (!dropboxPath) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "path required" }));
          return;
        }

        const accessToken = await getAccessToken();
        if (!accessToken) {
          res.statusCode = 503;
          res.end(JSON.stringify({ error: "Dropbox server token not configured" }));
          return;
        }

        const cachedLink = getCachedTemporaryLink(dropboxPath);
        if (cachedLink) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ link: cachedLink }));
          return;
        }

        const linkRes = await fetch("https://api.dropboxapi.com/2/files/get_temporary_link", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: dropboxPath }),
        });

        if (!linkRes.ok) {
          res.statusCode = linkRes.status;
          res.end(await linkRes.text());
          return;
        }

        const data = await linkRes.json();
        const expiresAt = data.metadata?.expires
          ? new Date(data.metadata.expires).getTime()
          : Date.now() + 3 * 60 * 60 * 1000;
        setCachedTemporaryLink(dropboxPath, data.link, expiresAt);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ link: data.link }));
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (url.pathname === "/api/dropbox/analyze") {
      await analyzeHandler(req, res);
      return;
    }

    next();
  };
}
