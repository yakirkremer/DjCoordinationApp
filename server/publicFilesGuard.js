import fs from "fs";
import path from "path";

function isUnderRoot(filePath, root) {
  const normalizedRoot = path.resolve(root);
  const normalizedFile = path.resolve(filePath);
  return normalizedFile === normalizedRoot || normalizedFile.startsWith(`${normalizedRoot}${path.sep}`);
}

export function createPublicFilesGuard({ publicRoot, distRoot = null } = {}) {
  const root = publicRoot || path.join(process.cwd(), "public");

  return (req, res, next) => {
    const raw = req.url?.split("?")[0] || "";
    if (!raw.startsWith("/music/") && !raw.startsWith("/data/")) {
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
