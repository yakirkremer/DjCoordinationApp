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
import { migrateLocalStorageToServer } from "../lib/migrateLocalStorage";
import * as dataApi from "../lib/api/dataApi";

const ACTIVE_CLIENT_KEY = "kramer-music-active-client-v1";

function loadActiveClientId() {
  try {
    return localStorage.getItem(ACTIVE_CLIENT_KEY);
  } catch {
    return null;
  }
}

function saveActiveClientId(clientId) {
  try {
    if (clientId) {
      localStorage.setItem(ACTIVE_CLIENT_KEY, clientId);
    } else {
      localStorage.removeItem(ACTIVE_CLIENT_KEY);
    }
  } catch {
    /* session stays per-browser */
  }
}

export default function useClients() {
  const [clients, setClients] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [activeClientId, setActiveClientId] = useState(() => loadActiveClientId());
  const saveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await migrateLocalStorageToServer(dataApi);
        const data = await fetchClients();
        if (!cancelled) {
          setClients(Array.isArray(data) ? data.map(normalizeClient) : []);
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveClientsApi(clients).catch((err) => {
        console.error("Failed to save clients:", err);
        setError(err.message);
      });
    }, 250);

    return () => clearTimeout(saveTimer.current);
  }, [clients, ready]);

  useEffect(() => {
    saveActiveClientId(activeClientId);
  }, [activeClientId]);

  const activeClient = clients.find((c) => c.id === activeClientId) ?? null;

  useEffect(() => {
    if (activeClientId && !activeClient) {
      setActiveClientId(null);
    }
  }, [activeClientId, activeClient]);

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
      if (activeClientId === id) {
        setActiveClientId(null);
      }
      deleteFeedback(id).catch((err) => console.error("Failed to delete client feedback:", err));
    },
    [activeClientId]
  );

  const login = useCallback(
    (loginCode) => {
      const code = loginCode.trim().toUpperCase();
      const client = clients.find((c) => c.loginCode === code);
      if (!client) return false;
      setActiveClientId(client.id);
      return true;
    },
    [clients]
  );

  const logout = useCallback(() => {
    setActiveClientId(null);
  }, []);

  return {
    clients,
    activeClient,
    ready,
    error,
    createClient,
    deleteClient,
    login,
    logout,
  };
}
