import {
  DROPBOX_API_URL,
  DROPBOX_TOKEN_URL,
  getDropboxAppKey,
} from "./constants";
import { loadDropboxState, saveDropboxState } from "./storage";

const linkCache = new Map();

export function parseDropboxApiError(text) {
  if (!text) return "Unknown Dropbox error";
  try {
    const json = JSON.parse(text);
    if (json.error_summary) return json.error_summary;
    if (json.error?.[".tag"]) return json.error[".tag"];
    if (json.error) return String(json.error);
  } catch {
    // not JSON
  }
  if (text.includes("files.metadata.read")) {
    return (
      "חסרה הרשאת files.metadata.read באפליקציית Dropbox.\n" +
      "1. פתח dropbox.com/developers/apps → האפליקציה שלך → Permissions\n" +
      "2. הפעל: files.metadata.read + files.content.read → Save\n" +
      "3. באפליקציה: נתק Dropbox → חבר מחדש"
    );
  }
  if (text.includes("not_found")) return text;
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}

async function dropboxFetch(path, { accessToken, body, raw = false, timeoutMs = 20_000 } = {}) {
  const init = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(timeoutMs),
  };

  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${DROPBOX_API_URL}${path}`, init);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(parseDropboxApiError(err) || `Dropbox API error (${res.status})`);
  }

  return raw ? res : res.json();
}

export class DropboxClient {
  constructor({ onTokenUpdate } = {}) {
    this.onTokenUpdate = onTokenUpdate;
  }

  isConfigured() {
    return Boolean(getDropboxAppKey());
  }

  hasSession() {
    const state = loadDropboxState();
    return Boolean(state.refreshToken || state.accessToken);
  }

  async getAccessToken() {
    const state = loadDropboxState();
    if (state.accessToken && Date.now() < state.expiresAt - 60_000) {
      return state.accessToken;
    }
    if (!state.refreshToken) {
      throw new Error("Not connected to Dropbox");
    }

    const appKey = getDropboxAppKey();
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: state.refreshToken,
      client_id: appKey,
    });

    const res = await fetch(DROPBOX_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(parseDropboxApiError(body) || "Dropbox session expired — reconnect in admin.");
    }

    const data = await res.json();
    const next = saveDropboxState({
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 14_400) * 1000,
    });
    this.onTokenUpdate?.(next);
    return data.access_token;
  }

  async exchangeCode(code, codeVerifier) {
    const appKey = getDropboxAppKey();
    const params = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: appKey,
      redirect_uri: `${window.location.origin}/dropbox/callback`,
      code_verifier: codeVerifier,
    });

    const res = await fetch(DROPBOX_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(parseDropboxApiError(body) || "Dropbox authorization failed");
    }

    const data = await res.json();
    const account = await this.fetchAccountWithToken(data.access_token);

    const next = saveDropboxState({
      refreshToken: data.refresh_token,
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 14_400) * 1000,
      accountEmail: account?.email ?? null,
    });
    this.onTokenUpdate?.(next);
    return next;
  }

  async fetchAccountWithToken(accessToken) {
    try {
      return await dropboxFetch("/users/get_current_account", { accessToken });
    } catch {
      return null;
    }
  }

  async getAccount() {
    const token = await this.getAccessToken();
    return dropboxFetch("/users/get_current_account", { accessToken: token });
  }

  async listFolder(path, { recursive = false } = {}) {
    const token = await this.getAccessToken();
    const entries = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      const payload = cursor
        ? { cursor }
        : { path, recursive, include_deleted: false };

      const endpoint = cursor ? "/files/list_folder/continue" : "/files/list_folder";
      const data = await dropboxFetch(endpoint, { accessToken: token, body: payload });
      entries.push(...(data.entries || []));
      hasMore = data.has_more;
      cursor = data.cursor;
    }

    return entries;
  }

  async getTemporaryLink(path) {
    const cached = linkCache.get(path);
    if (cached && Date.now() < cached.expiresAt - 60_000) {
      return cached.url;
    }

    const token = await this.getAccessToken();
    const data = await dropboxFetch("/files/get_temporary_link", {
      accessToken: token,
      body: { path },
    });

    const expiresAt = data.metadata?.expires
      ? new Date(data.metadata.expires).getTime()
      : Date.now() + 3 * 60 * 60 * 1000;

    linkCache.set(path, { url: data.link, expiresAt });
    return data.link;
  }
}

export async function fetchServerTemporaryLink(path) {
  const res = await fetch("/api/dropbox/temporary-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.link || null;
}
