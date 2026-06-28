import { useState, useEffect, useCallback } from "react";
import { PKCE_VERIFIER_KEY } from "../lib/dropbox/constants";
import { getDropboxAppKey } from "../lib/dropbox/constants";
import { generateCodeChallenge, generateCodeVerifier } from "../lib/dropbox/pkce";
import {
  buildAuthUrl,
  exchangeAuthCode,
  fetchAccountEmail,
  getAccessToken,
  importFromDropbox,
  listDropboxFolder,
  probeDropboxServer,
} from "../lib/dropbox/api";
import {
  clearDropboxState,
  isTokenValid,
  loadDropboxState,
  saveDropboxState,
} from "../lib/dropbox/storage";

export default function useDropboxImport() {
  const [state, setState] = useState(loadDropboxState);
  const [browsePath, setBrowsePath] = useState(() => loadDropboxState().rootPath || "");
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [serverReady, setServerReady] = useState(false);

  const isConfigured = Boolean(getDropboxAppKey());
  const isConnected = isTokenValid(state);
  const canBrowse = isConnected || serverReady;

  const refreshFolder = useCallback(async (path) => {
    const folderPath = path ?? loadDropboxState().rootPath ?? "";
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token && !(await probeDropboxServer())) {
        setEntries([]);
        return;
      }
      const data = await listDropboxFolder(folderPath);
      setBrowsePath(data.path ?? "");
      setEntries(data.entries ?? []);
      saveDropboxState({ rootPath: data.path ?? "" });
      setState(loadDropboxState());
    } catch (err) {
      setError(err.message || "Failed to load folder");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!window.location.pathname.endsWith("/dropbox/callback") && !code) return;

    (async () => {
      try {
        const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
        if (!code || !verifier) throw new Error("Missing OAuth code");
        const tokens = await exchangeAuthCode(code, verifier);
        sessionStorage.removeItem(PKCE_VERIFIER_KEY);

        const expiresAt = Date.now() + (tokens.expires_in || 14_400) * 1000;
        let accountEmail = null;
        try {
          accountEmail = await fetchAccountEmail(tokens.access_token);
        } catch {
          /* optional */
        }

        const next = saveDropboxState({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          expiresAt,
          accountEmail,
        });
        setState(next);
        window.history.replaceState({}, "", "/");
        await refreshFolder(next.rootPath || "");
      } catch (err) {
        setError(err.message || "Dropbox connection failed");
        window.history.replaceState({}, "", "/");
      }
    })();
  }, [refreshFolder]);

  useEffect(() => {
    probeDropboxServer().then(setServerReady).catch(() => setServerReady(false));
  }, []);

  useEffect(() => {
    if (!canBrowse) return;
    refreshFolder(state.rootPath || "");
  }, [canBrowse, refreshFolder, state.rootPath]);

  const connect = useCallback(async () => {
    setError("");
    if (!isConfigured) {
      setError("Set VITE_DROPBOX_APP_KEY in .env and restart the dev server.");
      return;
    }
    const verifier = generateCodeVerifier();
    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    const challenge = await generateCodeChallenge(verifier);
    window.location.href = buildAuthUrl(challenge);
  }, [isConfigured]);

  const disconnect = useCallback(() => {
    clearDropboxState();
    setState(loadDropboxState());
    setEntries([]);
    setSelected(new Set());
    setBrowsePath("");
    setError("");
    setStatus("");
  }, []);

  const openFolder = useCallback(
    (path) => {
      setSelected(new Set());
      refreshFolder(path);
    },
    [refreshFolder]
  );

  const goUp = useCallback(() => {
    if (!browsePath) return;
    const parts = browsePath.split("/").filter(Boolean);
    parts.pop();
    const parent = parts.length ? `/${parts.join("/")}` : "";
    openFolder(parent);
  }, [browsePath, openFolder]);

  const toggleSelect = useCallback((path) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const selectAllMp3 = useCallback(() => {
    const mp3Paths = entries.filter((e) => !e.isFolder && e.isMp3).map((e) => e.path);
    setSelected(new Set(mp3Paths));
  }, [entries]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const importSelected = useCallback(
    async (bucket) => {
      const paths = [...selected];
      if (!paths.length) {
        setError("בחרו לפחות שיר אחד");
        return null;
      }

      setImporting(true);
      setError("");
      setStatus("");

      try {
        const result = await importFromDropbox(paths, bucket);
        const count = result.imported?.length || 0;
        const failCount = result.errors?.length || 0;
        setStatus(
          failCount
            ? `יובאו ${count} שירים, ${failCount} נכשלו`
            : `יובאו ${count} שירים לקטלוג`
        );
        setSelected(new Set());
        return result;
      } catch (err) {
        setError(err.message || "Import failed");
        return null;
      } finally {
        setImporting(false);
      }
    },
    [selected]
  );

  return {
    isConfigured,
    isConnected,
    canBrowse,
    accountEmail: state.accountEmail,
    browsePath,
    entries,
    selected,
    loading,
    importing,
    error,
    status,
    connect,
    disconnect,
    openFolder,
    goUp,
    toggleSelect,
    selectAllMp3,
    clearSelection,
    importSelected,
    refreshFolder,
  };
}
