import { DROPBOX_STORAGE_KEY } from "./constants";

const DEFAULT_STATE = {
  refreshToken: null,
  accessToken: null,
  expiresAt: 0,
  accountEmail: null,
  rootPath: "/",
  musicSource: "local",
};

export function loadDropboxState() {
  try {
    const raw = localStorage.getItem(DROPBOX_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveDropboxState(patch) {
  const next = { ...loadDropboxState(), ...patch };
  localStorage.setItem(DROPBOX_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearDropboxState() {
  localStorage.removeItem(DROPBOX_STORAGE_KEY);
}

const CATALOG_CACHE_KEY = "kramer-music-dropbox-catalog-v1";

export function saveDropboxCatalog(tracks) {
  localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(tracks));
}

export function loadDropboxCatalog() {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
