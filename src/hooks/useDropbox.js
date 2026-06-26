import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DROPBOX_AUTH_URL,
  DROPBOX_SCOPES,
  PKCE_VERIFIER_KEY,
  getDropboxAppKey,
  getRedirectUri,
} from "../lib/dropbox/constants";
import { generateCodeChallenge, generateCodeVerifier } from "../lib/dropbox/pkce";
import { DropboxClient } from "../lib/dropbox/api";
import { clearDropboxState, loadDropboxState, saveDropboxState, saveDropboxCatalog } from "../lib/dropbox/storage";
import { syncCatalogFromDropbox } from "../lib/dropbox/sync";

export default function useDropbox() {
  const [state, setState] = useState(loadDropboxState);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [error, setError] = useState(null);

  const client = useMemo(
    () => new DropboxClient({ onTokenUpdate: setState }),
    []
  );

  const isConfigured = Boolean(getDropboxAppKey());
  const isConnected = Boolean(state.refreshToken || state.accessToken);

  const handleOAuthCallback = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const oauthError = params.get("error");

    if (!window.location.pathname.endsWith("/dropbox/callback") && !code) return;

    if (oauthError) {
      setError(oauthError);
      window.history.replaceState({}, "", "/");
      return;
    }

    if (!code) return;

    const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
    if (!verifier) {
      setError("OAuth session expired — try connecting again.");
      window.history.replaceState({}, "", "/");
      return;
    }

    try {
      await client.exchangeCode(code, verifier);
      sessionStorage.removeItem(PKCE_VERIFIER_KEY);
      setError(null);
    } catch (err) {
      setError(err.message || "Dropbox connection failed");
    } finally {
      window.history.replaceState({}, "", "/");
    }
  }, [client]);

  useEffect(() => {
    handleOAuthCallback();
  }, [handleOAuthCallback]);

  const connect = useCallback(async () => {
    setError(null);
    if (!isConfigured) {
      setError("Set VITE_DROPBOX_APP_KEY in .env and restart the dev server.");
      return;
    }

    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);

    const params = new URLSearchParams({
      client_id: getDropboxAppKey(),
      response_type: "code",
      redirect_uri: getRedirectUri(),
      code_challenge: challenge,
      code_challenge_method: "S256",
      token_access_type: "offline",
      scope: DROPBOX_SCOPES.join(" "),
    });

    window.location.href = `${DROPBOX_AUTH_URL}?${params}`;
  }, [isConfigured]);

  const disconnect = useCallback(() => {
    clearDropboxState();
    setState(loadDropboxState());
    setError(null);
  }, []);

  const setRootPath = useCallback((rootPath) => {
    setState(saveDropboxState({ rootPath }));
  }, []);

  const setMusicSource = useCallback((musicSource) => {
    setState(saveDropboxState({ musicSource }));
  }, []);

  const syncCatalog = useCallback(
    async (existingTracks = []) => {
      if (!isConnected) {
        throw new Error("Connect Dropbox first");
      }

      setSyncing(true);
      setSyncProgress(null);
      setError(null);
      try {
        const result = await syncCatalogFromDropbox(client, state.rootPath, existingTracks, {
          onProgress: setSyncProgress,
        });
        const { tracks, analyzedCount, analyzeFailedCount, totalFound, diagnosticsMessage } = result;
        saveDropboxState({ musicSource: "dropbox", lastSyncAt: Date.now() });
        if (tracks.length > 0) {
          saveDropboxCatalog(tracks);
        }
        setState(loadDropboxState());
        return { tracks, analyzedCount, analyzeFailedCount, totalFound, diagnosticsMessage };
      } catch (err) {
        setError(err.message || "Sync failed");
        throw err;
      } finally {
        setSyncing(false);
        setSyncProgress(null);
      }
    },
    [client, isConnected, state.rootPath]
  );

  return {
    isConfigured,
    isConnected,
    accountEmail: state.accountEmail,
    rootPath: state.rootPath,
    musicSource: state.musicSource,
    lastSyncAt: state.lastSyncAt,
    syncing,
    syncProgress,
    error,
    client,
    connect,
    disconnect,
    setRootPath,
    setMusicSource,
    syncCatalog,
  };
}
