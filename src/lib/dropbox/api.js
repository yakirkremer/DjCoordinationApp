import {
  DROPBOX_AUTH_URL,
  DROPBOX_TOKEN_URL,
  DROPBOX_SCOPES,
  getDropboxAppKey,
  getRedirectUri,
} from "./constants";
import { loadDropboxState, saveDropboxState, isTokenValid } from "./storage";

async function parseError(res) {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return data.error_description || data.error?.summary || data.error || text;
  } catch {
    return text || `Request failed (${res.status})`;
  }
}

export async function getAccessToken() {
  const state = loadDropboxState();
  if (isTokenValid(state)) return state.accessToken;

  if (state.refreshToken) {
    const appKey = getDropboxAppKey();
    const res = await fetch(DROPBOX_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: state.refreshToken,
        client_id: appKey,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const next = saveDropboxState({
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 14_400) * 1000,
      });
      return next.accessToken;
    }
  }

  return null;
}

export async function exchangeAuthCode(code, codeVerifier) {
  const appKey = getDropboxAppKey();
  const res = await fetch(DROPBOX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: appKey,
      redirect_uri: getRedirectUri(),
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}

export async function fetchAccountEmail(accessToken) {
  const res = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.email || null;
}

export function buildAuthUrl(codeChallenge) {
  const params = new URLSearchParams({
    client_id: getDropboxAppKey(),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    token_access_type: "offline",
    scope: DROPBOX_SCOPES.join(" "),
  });
  return `${DROPBOX_AUTH_URL}?${params}`;
}

export async function listDropboxFolder(path = "") {
  const token = await getAccessToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch("/api/dropbox/list", {
    method: "POST",
    headers,
    body: JSON.stringify({ path }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to list folder");
  return data;
}

export async function importFromDropbox(paths, bucket) {
  const token = await getAccessToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch("/api/dropbox/import", {
    method: "POST",
    headers,
    body: JSON.stringify({ paths, bucket }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Import failed");
  return data;
}

export async function probeDropboxServer() {
  const res = await fetch("/api/dropbox/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "" }),
  });
  return res.ok;
}
