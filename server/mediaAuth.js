import { isAuthenticatedSession, parseRequestSession } from "./auth.js";

export function createMediaAuthMiddleware() {
  return (req, res, next) => {
    const raw = req.url?.split("?")[0] || "";
    if (!raw.startsWith("/music/")) {
      next();
      return;
    }

    const session = parseRequestSession(req);
    if (!isAuthenticatedSession(session)) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Unauthorized");
      return;
    }

    next();
  };
}
