import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createDataApiMiddleware } from "./server/dataStore.js";
import { createUploadMusicMiddleware } from "./server/uploadMusic.js";

function dataApiPlugin() {
  const attach = (server) => {
    server.middlewares.use(createDataApiMiddleware());
    server.middlewares.use(createUploadMusicMiddleware());
  };
  return {
    name: "data-api",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig({
  plugins: [react(), dataApiPlugin()],
  appType: "spa",
});
