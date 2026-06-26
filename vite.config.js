import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createDataApiMiddleware } from "./server/dataStore.js";
import { createDropboxApiMiddleware, refreshDropboxToken } from "./server/dropboxApi.js";

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
  const middleware = createDropboxApiMiddleware(getAccessToken);

  const attach = (server) => {
    server.middlewares.use((req, res, next) => {
      middleware(req, res, next);
    });
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
