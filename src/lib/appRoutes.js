export const ADMIN_TAB_IDS = [
  "catalog",
  "organize",
  "order",
  "clients",
  "form",
  "copy",
  "analytics",
  "settings",
];

const CLIENT_PATHS = {
  "/": { guestView: "welcome", clientScreen: "home", requiresClient: false },
  "/home": { guestView: "welcome", clientScreen: "home", requiresClient: true },
  "/browse": { guestView: "welcome", clientScreen: "browse", requiresClient: true },
  "/wizard": { guestView: "welcome", clientScreen: "wizard", requiresClient: true },
  "/guide": { guestView: "guide", clientScreen: "guide", requiresClient: false },
  "/tutorial": { guestView: "tutorial", clientScreen: "tutorial", requiresClient: false },
};

export function normalizeAppPath(pathname) {
  const path = String(pathname ?? "").split("?")[0].split("#")[0];
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

export function adminTabPath(tab) {
  if (!tab || tab === "catalog") return "/admin";
  return `/admin/${tab}`;
}

export function clientScreenPath(screen) {
  if (!screen || screen === "home") return "/home";
  if (screen === "welcome") return "/";
  return `/${screen}`;
}

export function parseAppPath(pathname) {
  const path = normalizeAppPath(pathname);

  if (path.startsWith("/dropbox/callback")) {
    return { area: "dropbox" };
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    const segment = path === "/admin" ? "catalog" : path.slice("/admin/".length).split("/")[0];
    const adminTab = ADMIN_TAB_IDS.includes(segment) ? segment : "catalog";
    return { area: "admin", adminTab };
  }

  const client = CLIENT_PATHS[path];
  if (client) {
    return { area: "client", ...client };
  }

  return { area: "client", guestView: "welcome", clientScreen: "home", requiresClient: false };
}
