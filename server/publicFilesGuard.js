import fs from "fs";
import path from "path";
import { isUnderRoot } from "./pathSafety.js";

export function createPublicFilesGuard({ publicRoot, distRoot = null } = {}) {
  const root = publicRoot || path.join(process.cwd(), "public");

  return (req, res, next) => {
    const raw = req.url?.split("?")[0] || "";

    if (raw.startsWith("/data/") && !raw.startsWith("/data/artwork/")) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }

    if (!raw.startsWith("/music/") && !raw.startsWith("/data/artwork/")) {
      next();
      return;
    }

    const pathname = decodeURIComponent(raw);
    const publicPath = path.join(root, pathname);
    let exists = isUnderRoot(publicPath, root) && fs.existsSync(publicPath);

    if (!exists && distRoot) {
      const distPath = path.join(distRoot, pathname);
      exists = isUnderRoot(distPath, distRoot) && fs.existsSync(distPath);
    }

    if (!exists) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    next();
  };
}

export function publicFilesGuardPlugin(options = {}) {
  const attach = (server) => {
    server.middlewares.use(createPublicFilesGuard(options));
  };
  return {
    name: "public-files-guard",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
