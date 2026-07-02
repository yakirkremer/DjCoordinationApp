import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchContracts,
  saveContracts as saveContractsApi,
  generateTicketId,
} from "../lib/api/contractApi";

export default function useContracts(enabled = false) {
  const [contracts, setContracts] = useState({ templates: [], tickets: [] });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const saveTimer = useRef(null);

  const loadContracts = useCallback(async () => {
    const data = await fetchContracts();
    setContracts({
      templates: Array.isArray(data.templates) ? data.templates : [],
      tickets: Array.isArray(data.tickets) ? data.tickets : [],
    });
    setLoaded(true);
    return data;
  }, []);

  useEffect(() => {
    if (!enabled || loaded) return;
    loadContracts().catch((err) => setError(err.message));
  }, [enabled, loaded, loadContracts]);

  useEffect(() => {
    if (!loaded || !enabled) return;

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveContractsApi(contracts).catch((err) => {
        console.error("Failed to save contracts:", err);
        setError(err.message);
      });
    }, 300);

    return () => clearTimeout(saveTimer.current);
  }, [contracts, loaded, enabled]);

  const updateTemplate = useCallback((templateId, patch) => {
    setContracts((prev) => ({
      ...prev,
      templates: prev.templates.map((t) => (t.id === templateId ? { ...t, ...patch } : t)),
    }));
  }, []);

  const deleteTemplate = useCallback((templateId) => {
    setContracts((prev) => ({
      templates: prev.templates.filter((t) => t.id !== templateId),
      tickets: prev.tickets.filter((t) => t.templateId !== templateId),
    }));
  }, []);

  const createTicket = useCallback((clientId, templateId) => {
    if (!clientId || !templateId) return null;

    let created = null;
    setContracts((prev) => {
      const existing = prev.tickets.find((t) => t.clientId === clientId);
      if (existing) {
        created = existing;
        return prev;
      }

      const ticket = {
        id: generateTicketId(),
        clientId,
        templateId,
        status: "pending",
        sentAt: new Date().toISOString(),
        signedAt: null,
        values: {},
      };
      created = ticket;
      return {
        ...prev,
        tickets: [...prev.tickets, ticket],
      };
    });

    return created;
  }, []);

  const deleteClientTickets = useCallback((clientId) => {
    setContracts((prev) => ({
      ...prev,
      tickets: prev.tickets.filter((t) => t.clientId !== clientId),
    }));
  }, []);

  const getTicketForClient = useCallback(
    (clientId) => contracts.tickets.find((t) => t.clientId === clientId) ?? null,
    [contracts.tickets]
  );

  const getTemplate = useCallback(
    (templateId) => contracts.templates.find((t) => t.id === templateId) ?? null,
    [contracts.templates]
  );

  return {
    contracts,
    loaded,
    error,
    loadContracts,
    updateTemplate,
    deleteTemplate,
    createTicket,
    deleteClientTickets,
    getTicketForClient,
    getTemplate,
    setContracts,
  };
}
