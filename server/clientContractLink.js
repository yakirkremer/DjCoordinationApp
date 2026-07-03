import { readJsonFile, writeJsonFile, DATA_FILES } from "./dataStore.js";
import {
  dedupeTicketsByClient,
  pickCanonicalTicketForClient,
} from "../src/lib/contractTickets.js";

const CONTRACTS_FILE = "contracts.json";

async function readContracts() {
  const data = await readJsonFile(CONTRACTS_FILE, { templates: [], tickets: [] });
  return {
    templates: Array.isArray(data.templates) ? data.templates : [],
    tickets: dedupeTicketsByClient(Array.isArray(data.tickets) ? data.tickets : []),
  };
}

async function writeContracts(data) {
  await writeJsonFile(CONTRACTS_FILE, {
    templates: Array.isArray(data.templates) ? data.templates : [],
    tickets: dedupeTicketsByClient(Array.isArray(data.tickets) ? data.tickets : []),
  });
}

async function readClients() {
  const clients = await readJsonFile(DATA_FILES.clients, []);
  return Array.isArray(clients) ? clients : [];
}

async function writeClients(clients) {
  await writeJsonFile(DATA_FILES.clients, clients);
}

export async function setClientContractTicketId(clientId, ticketId) {
  if (!clientId) return;
  const clients = await readClients();
  const index = clients.findIndex((c) => c.id === clientId);
  if (index === -1) return;

  const nextTicketId = ticketId || null;
  if (clients[index].contractTicketId === nextTicketId) return;

  clients[index] = { ...clients[index], contractTicketId: nextTicketId };
  await writeClients(clients);
}

export async function deleteClientContractTicket(clientId) {
  if (!clientId) return false;

  const contracts = await readContracts();
  const removed = contracts.tickets.filter((t) => t.clientId === clientId);
  if (removed.length === 0) return false;

  contracts.tickets = contracts.tickets.filter((t) => t.clientId !== clientId);
  await writeContracts(contracts);
  await setClientContractTicketId(clientId, null);
  return true;
}

async function deleteClientFeedback(clientId) {
  const all = await readJsonFile(DATA_FILES.feedback, {});
  if (!(clientId in all)) return;
  delete all[clientId];
  await writeJsonFile(DATA_FILES.feedback, all);
}

/** Remove contracts and feedback when clients are deleted from clients.json. */
export async function cascadeDeleteClientData(clientIds) {
  if (!Array.isArray(clientIds) || clientIds.length === 0) return;

  for (const clientId of clientIds) {
    await deleteClientContractTicket(clientId);
    await deleteClientFeedback(clientId);
  }
}

/** Ensure client.contractTicketId matches the canonical ticket (repair on assign). */
export async function syncClientContractTicketId(clientId) {
  const contracts = await readContracts();
  const ticket = pickCanonicalTicketForClient(contracts.tickets, clientId);
  await setClientContractTicketId(clientId, ticket?.id ?? null);
  return ticket?.id ?? null;
}

/**
 * Remove contract tickets whose client no longer exists (legacy data).
 * Safe to run on every startup — only writes when orphans are found.
 */
export async function removeOrphanContractTickets() {
  const clients = await readClients();
  const clientIds = new Set(clients.map((c) => c.id).filter(Boolean));
  const contracts = await readContracts();

  const orphans = contracts.tickets.filter((t) => !t.clientId || !clientIds.has(t.clientId));
  if (orphans.length === 0) {
    return { removed: 0, clientIds: [] };
  }

  const orphanClientIds = [...new Set(orphans.map((t) => t.clientId).filter(Boolean))];
  contracts.tickets = contracts.tickets.filter((t) => t.clientId && clientIds.has(t.clientId));
  await writeContracts(contracts);

  return { removed: orphans.length, clientIds: orphanClientIds };
}

/**
 * Backfill or fix client.contractTicketId from existing contract tickets,
 * and remove legacy tickets for deleted clients.
 * Safe to run on every startup — only writes when something changed.
 */
export async function repairClientContractLinks() {
  const { removed: orphansRemoved, clientIds: orphanClientIds } =
    await removeOrphanContractTickets();

  const clients = await readClients();
  let updated = 0;

  if (clients.length > 0) {
    const contracts = await readContracts();
    const nextClients = clients.map((client) => {
      const canonical = pickCanonicalTicketForClient(contracts.tickets, client.id);
      const expected = canonical?.id ?? null;
      const current = client.contractTicketId ?? null;
      if (current === expected) return client;
      updated += 1;
      return { ...client, contractTicketId: expected };
    });

    if (updated > 0) {
      await writeClients(nextClients);
    }
  }

  return { updated, orphansRemoved, orphanClientIds };
}
