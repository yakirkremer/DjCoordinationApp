import { sendJson } from "./dataStore.js";

export function createApiNotFoundMiddleware() {
  return (req, res, next) => {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/api/")) {
      next();
      return;
    }

    // #region agent log
    fetch("http://127.0.0.1:7664/ingest/f1ecf0fb-07fc-4a84-9f87-8853c6bbd5f6", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "029ae8" },
      body: JSON.stringify({
        sessionId: "029ae8",
        location: "server/apiNotFound.js:14",
        message: "unmatched API route",
        data: { method: req.method, pathname: url.pathname },
        timestamp: Date.now(),
        hypothesisId: "H1",
      }),
    }).catch(() => {});
    // #endregion

    sendJson(res, 404, { error: "Not found" });
  };
}
