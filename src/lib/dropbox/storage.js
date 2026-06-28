import { DROPBOX_STORAGE_KEY } from "./constants";

const DEFAULT_STATE = {
  accessToken: null,
  refreshToken: null,
  expiresAt: 0,
  accountEmail: null,
  rootPath: "",
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

export function isTokenValid(state = loadDropboxState()) {
  return Boolean(state.accessToken && Date.now() < (state.expiresAt || 0) - 60_000);
}
