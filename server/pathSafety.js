import path from "path";

export function isUnderRoot(filePath, root) {
  const normalizedRoot = path.resolve(root);
  const normalizedFile = path.resolve(filePath);
  return (
    normalizedFile === normalizedRoot ||
    normalizedFile.startsWith(`${normalizedRoot}${path.sep}`)
  );
}

/** Resolve a URL path (e.g. /music/hits/analyzed/x.mp3) under root, or null if traversal. */
export function safePathUnderRoot(root, urlPathname) {
  const normalizedRoot = path.resolve(root);
  const relative = decodeURIComponent(urlPathname).replace(/^\/+/, "");
  const filePath = path.resolve(path.join(normalizedRoot, relative));
  if (!isUnderRoot(filePath, normalizedRoot)) return null;
  return filePath;
}
