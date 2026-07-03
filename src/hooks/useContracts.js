import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchContracts,
  saveContracts as saveContractsApi,
  assignContractTicket as assignContractTicketApi,
} from "../lib/api/contractApi";
import { patchAdminTicketValues } from "../lib/contractFields";
import { dedupeTicketsByClient, pickCanonicalTicketForClient } from "../lib/contractTickets";

function normalizeTickets(tickets) {
  return dedupeTicketsByClient(Array.isArray(tickets) ? tickets : []);
}

function isFullContractsDocument(data) {
  return Array.isArray(data?.templates) && Array.isArray(data?.tickets);
}

function mergeContractsBeforeSave(local, server) {
  if (!isFullContractsDocument(server)) return local;

  const serverById = new Map(server.tickets.map((ticket) => [ticket.id, ticket]));
  const mergedTickets = local.tickets.map((localTicket) => {
    const serverTicket = serverById.get(localTicket.id);
    if (!serverTicket) return localTicket;
    if (serverTicket.status === "signed" && localTicket.status !== "signed") {
      return { ...localTicket, ...serverTicket };
    }
    if (
      serverTicket.signedAt &&
      (!localTicket.signedAt || serverTicket.signedAt > localTicket.signedAt)
    ) {
      return { ...localTicket, ...serverTicket };
    }
    return localTicket;
  });

  for (const serverTicket of server.tickets) {
    if (!mergedTickets.some((ticket) => ticket.id === serverTicket.id)) {
      mergedTickets.push(serverTicket);
    }
  }

  return {
    templates: local.templates,
    tickets: dedupeTicketsByClient(mergedTickets),
  };
}

export default function useContracts(enabled = false) {
  const [contracts, setContracts] = useState({ templates: [], tickets: [] });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const saveTimer = useRef(null);
  const skipNextSave = useRef(false);
  const saveGeneration = useRef(0);

  const loadContracts = useCallback(async () => {
    saveGeneration.current += 1;
    const data = await fetchContracts();
    if (!isFullContractsDocument(data)) {
      return data;
    }
    skipNextSave.current = true;
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
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const generation = ++saveGeneration.current;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const snapshot = contracts;
      try {
        const serverData = await fetchContracts();
        if (generation !== saveGeneration.current) return;

        const payload = isFullContractsDocument(serverData)
          ? mergeContractsBeforeSave(snapshot, serverData)
          : snapshot;

        const ticketsChanged =
          JSON.stringify(payload.tickets) !== JSON.stringify(snapshot.tickets);
        if (ticketsChanged) {
          skipNextSave.current = true;
          setContracts(payload);
        }

        if (generation !== saveGeneration.current) return;
        await saveContractsApi(payload);
      } catch (err) {
        if (generation !== saveGeneration.current) return;
        console.error("Failed to save contracts:", err);
        setError(err.message);
      }
    }, 300);

    return () => clearTimeout(saveTimer.current);
  }, [contracts, loaded, enabled]);

  const updateTemplate = useCallback((templateId, patch) => {
    setContracts((prev) => ({
      ...prev,
      templates: prev.templates.map((t) => (t.id === templateId ? { ...t, ...patch } : t)),
    }));
  }, []);

  const deleteTemplate = useCallback(
    async (templateId) => {
      let nextState = null;
      setContracts((prev) => {
        nextState = {
          templates: prev.templates.filter((t) => t.id !== templateId),
          tickets: prev.tickets.filter((t) => t.templateId !== templateId),
        };
        return nextState;
      });

      skipNextSave.current = true;
      saveGeneration.current += 1;
      clearTimeout(saveTimer.current);

      try {
        const serverData = await fetchContracts();
        const payload = isFullContractsDocument(serverData)
          ? mergeContractsBeforeSave(nextState, serverData)
          : nextState;
        await saveContractsApi(payload);
        setContracts(payload);
      } catch (err) {
        console.error("Failed to delete contract template:", err);
        setError(err.message);
        await loadContracts();
        throw err;
      }
    },
    [loadContracts]
  );

  const createTicket = useCallback(async (clientId, templateId, clientProfile = null) => {
    if (!clientId || !templateId) return null;

    try {
      const data = await assignContractTicketApi(clientId, templateId, clientProfile);
      const ticket = data.ticket;
      if (!ticket) return null;

      const { template: _template, ...ticketData } = ticket;
      skipNextSave.current = true;
      setContracts((prev) => ({
        ...prev,
        tickets: dedupeTicketsByClient([
          ...prev.tickets.filter((t) => t.clientId !== clientId && t.id !== ticketData.id),
          ticketData,
        ]),
      }));
      return ticket;
    } catch (err) {
      console.error("Failed to assign contract ticket:", err);
      setError(err.message);
      return null;
    }
  }, []);

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
    (clientId) => pickCanonicalTicketForClient(contracts.tickets, clientId),
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
