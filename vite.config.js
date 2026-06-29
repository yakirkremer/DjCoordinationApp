import { defineConfig, loadEnv } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import { createDataApiMiddleware } from "./server/dataStore.js";
import { createUploadMusicMiddleware } from "./server/uploadMusic.js";
import { createDropboxImportMiddleware, refreshDropboxToken } from "./server/dropboxImport.js";
import { createArtworkApiMiddleware } from "./server/artworkApi.js";
import { createAuthApiMiddleware } from "./server/authApi.js";
import { createMediaAuthMiddleware } from "./server/mediaAuth.js";
import { createApiNotFoundMiddleware } from "./server/apiNotFound.js";
import { publicFilesGuardPlugin } from "./server/publicFilesGuard.js";

function dataApiPlugin() {
  const attach = (server) => {
    server.middlewares.use(createAuthApiMiddleware());
    server.middlewares.use(createDataApiMiddleware());
    server.middlewares.use(createUploadMusicMiddleware());
    server.middlewares.use(createArtworkApiMiddleware());
  };
  return {
    name: "data-api",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

function dropboxImportPlugin(env) {
  const middleware = createDropboxImportMiddleware(() => refreshDropboxToken(env));
  const attach = (server) => {
    server.middlewares.use(middleware);
    server.middlewares.use(createApiNotFoundMiddleware());
    server.middlewares.use(createMediaAuthMiddleware());
  };
  return {
    name: "dropbox-import-api",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const storageRoot = env.STORAGE_ROOT
    ? path.resolve(env.STORAGE_ROOT)
    : path.join(process.cwd(), "public");

  return {
    plugins: [
      react(),
      publicFilesGuardPlugin({
        publicRoot: storageRoot,
        distRoot: path.join(process.cwd(), "dist"),
      }),
      dataApiPlugin(),
      dropboxImportPlugin(env),
    ],
    appType: "spa",
  };
});
