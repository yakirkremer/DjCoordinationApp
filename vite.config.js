import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createDataApiMiddleware } from "./server/dataStore.js";
import { createDropboxAnalyzeMiddleware } from "./server/dropboxAnalyze.js";

let cachedAccessToken = null;
let tokenExpiresAt = 0;

async function refreshDropboxToken(env) {
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

function dataApiPlugin() {
  const attach = (server) => {
    server.middlewares.use(createDataApiMiddleware());
  };
  return {
    name: "data-api",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

function dropboxApiPlugin(env) {
  const getAccessToken = () => refreshDropboxToken(env);

  const attach = (server) => {
    server.middlewares.use("/api/dropbox/temporary-link", async (req, res) => {
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
            const { path } = JSON.parse(body || "{}");
            if (!path) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "path required" }));
              return;
            }

            const accessToken = await refreshDropboxToken(env);
            if (!accessToken) {
              res.statusCode = 503;
              res.end(JSON.stringify({ error: "Dropbox server token not configured" }));
              return;
            }

            const linkRes = await fetch("https://api.dropboxapi.com/2/files/get_temporary_link", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ path }),
            });

            if (!linkRes.ok) {
              res.statusCode = linkRes.status;
              res.end(await linkRes.text());
              return;
            }

            const data = await linkRes.json();
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ link: data.link }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

    server.middlewares.use("/api/dropbox/analyze", createDropboxAnalyzeMiddleware(getAccessToken));
  };

  return {
    name: "dropbox-api",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), dataApiPlugin(), dropboxApiPlugin(env)],
    appType: "spa",
  };
});
