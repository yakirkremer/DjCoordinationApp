import { useState, useEffect, useCallback, useRef } from "react";
import {
  generateClientId,
  generateLoginCode,
  normalizeClient,
} from "../lib/clientStorage";
import { DEFAULT_CLIENT_TYPE, normalizeClientType } from "../lib/clientTypes";
import {
  fetchClients,
  saveClients as saveClientsApi,
  deleteFeedback,
} from "../lib/api/dataApi";
import { fetchSession, loginClient, logoutSession } from "../lib/api/auth";
import { migrateLocalStorageToServer, shouldMigrateLocalStorage } from "../lib/migrateLocalStorage";
import * as dataApi from "../lib/api/dataApi";

export default function useClients() {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await fetchSession();
        if (!cancelled && session.authenticated && session.role === "client" && session.client) {
          setActiveClient(normalizeClient(session.client));
        }
      } catch {
        /* welcome screen works without session */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const ensureClientsLoaded = useCallback(async () => {
    if (clientsLoaded) return clients;
    const data = await fetchClients();
    const normalized = Array.isArray(data) ? data.map(normalizeClient) : [];
    setClients(normalized);
    setClientsLoaded(true);
    return normalized;
  }, [clients, clientsLoaded]);

  useEffect(() => {
    if (!clientsLoaded) return;

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveClientsApi(clients).catch((err) => {
        console.error("Failed to save clients:", err);
        setError(err.message);
      });
    }, 250);

    return () => clearTimeout(saveTimer.current);
  }, [clients, clientsLoaded]);

  const createClient = useCallback(
    (name, loginCode, clientType = DEFAULT_CLIENT_TYPE) => {
      const trimmedName = name.trim();
      if (!trimmedName) return null;

      const code = (loginCode?.trim() || generateLoginCode()).toUpperCase();
      const exists = clients.some((c) => c.loginCode === code);
      if (exists) return null;

      const client = {
        id: generateClientId(),
        name: trimmedName,
        loginCode: code,
        clientType: normalizeClientType(clientType),
        createdAt: new Date().toISOString(),
      };

      setClients((prev) => [...prev, client]);
      return client;
    },
    [clients]
  );

  const deleteClient = useCallback(
    (id) => {
      setClients((prev) => prev.filter((c) => c.id !== id));
      if (activeClient?.id === id) {
        setActiveClient(null);
        logoutSession().catch(() => {});
      }
      deleteFeedback(id).catch((err) => console.error("Failed to delete client feedback:", err));
    },
    [activeClient?.id]
  );

  const login = useCallback(async (loginCode) => {
    try {
      const result = await loginClient(loginCode);
      if (!result?.client) return false;
      setActiveClient(normalizeClient(result.client));
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setActiveClient(null);
    logoutSession().catch(() => {});
  }, []);

  const bootstrapAdmin = useCallback(async () => {
    if (shouldMigrateLocalStorage()) {
      await migrateLocalStorageToServer(dataApi);
    }
    await ensureClientsLoaded();
  }, [ensureClientsLoaded]);

  return {
    clients,
    activeClient,
    ready,
    error,
    clientsLoaded,
    createClient,
    deleteClient,
    login,
    logout,
    ensureClientsLoaded,
    bootstrapAdmin,
  };
}
