import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchContracts,
  saveContracts as saveContractsApi,
  generateTicketId,
} from "../lib/api/contractApi";
import { generateSignToken } from "../lib/contractTokens";
import { patchAdminTicketValues, buildTicketDisplayValuesWithProfile } from "../lib/contractFields";

function normalizeTickets(tickets) {
  return (Array.isArray(tickets) ? tickets : []).map((ticket) =>
    ticket.signToken ? ticket : { ...ticket, signToken: generateSignToken() }
  );
}

function isFullContractsDocument(data) {
  return Array.isArray(data?.templates) && Array.isArray(data?.tickets);
}

export default function useContracts(enabled = false) {
  const [contracts, setContracts] = useState({ templates: [], tickets: [] });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const saveTimer = useRef(null);

  const loadContracts = useCallback(async () => {
    const data = await fetchContracts();
    if (!isFullContractsDocument(data)) {
      return data;
    }
    setContracts({
      templates: data.templates,
      tickets: normalizeTickets(data.tickets),
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

  const createTicket = useCallback((clientId, templateId, clientProfile = null) => {
    if (!clientId || !templateId) return null;

    let created = null;
    let nextState = null;
    setContracts((prev) => {
      const existing = prev.tickets.find((t) => t.clientId === clientId);
      if (existing) {
        created = existing;
        return prev;
      }

      const template = prev.templates.find((t) => t.id === templateId);
      const fields = template?.fields ?? [];
      const values = clientProfile
        ? buildTicketDisplayValuesWithProfile(fields, {}, clientProfile)
        : {};

      const ticket = {
        id: generateTicketId(),
        clientId,
        templateId,
        status: "pending",
        sentAt: new Date().toISOString(),
        signedAt: null,
        values,
        signToken: generateSignToken(),
      };
      created = ticket;
      nextState = {
        ...prev,
        tickets: [...prev.tickets, ticket],
      };
      return nextState;
    });

    if (nextState && loaded) {
      clearTimeout(saveTimer.current);
      saveContractsApi(nextState).catch((err) => {
        console.error("Failed to save contract ticket:", err);
        setError(err.message);
      });
    }

    return created;
  }, [loaded]);

  const deleteClientTickets = useCallback((clientId) => {
    setContracts((prev) => ({
      ...prev,
      tickets: prev.tickets.filter((t) => t.clientId !== clientId),
    }));
  }, []);

  const updateTicketAdminValues = useCallback((ticketId, adminPatch) => {
    setContracts((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        const template = prev.templates.find((tpl) => tpl.id === t.templateId);
        return {
          ...t,
          values: patchAdminTicketValues(template?.fields ?? [], t.values ?? {}, adminPatch),
        };
      }),
    }));
  }, []);

  const replaceTicket = useCallback((ticket) => {
    if (!ticket?.id) return;
    const { template: _template, ...ticketData } = ticket;
    setContracts((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) => (t.id === ticketData.id ? { ...t, ...ticketData } : t)),
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
    updateTicketAdminValues,
    replaceTicket,
    getTicketForClient,
    getTemplate,
    setContracts,
  };
}
