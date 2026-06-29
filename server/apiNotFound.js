import { sendJson } from "./dataStore.js";

export function createApiNotFoundMiddleware() {
  return (req, res, next) => {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/api/")) {
      next();
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  };
}
