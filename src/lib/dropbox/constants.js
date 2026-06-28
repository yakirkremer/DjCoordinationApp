export const DROPBOX_STORAGE_KEY = "kramer-music-dropbox-import-v1";
export const PKCE_VERIFIER_KEY = "kramer-music-dropbox-pkce";

export const DROPBOX_SCOPES = ["files.metadata.read", "files.content.read"];

export function getDropboxAppKey() {
  return import.meta.env.VITE_DROPBOX_APP_KEY || "";
}

export function getRedirectUri() {
  return `${window.location.origin}/dropbox/callback`;
}

export const DROPBOX_AUTH_URL = "https://www.dropbox.com/oauth2/authorize";
export const DROPBOX_TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";
