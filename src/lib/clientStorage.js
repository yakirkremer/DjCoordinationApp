import { normalizeClientType } from "./clientTypes";
import { DEFAULT_CLIENT_STAGES, getClientStages } from "./clientStages";

export function normalizeClient(client) {
  const contractTicketId = client.contractTicketId ?? null;
  return {
    ...client,
    clientType: normalizeClientType(client.clientType),
    stages: getClientStages(client),
    eventDate: String(client.eventDate ?? "").trim(),
    eventLocation: String(client.eventLocation ?? "").trim(),
    contractTicketId: contractTicketId || null,
  };
}

export { DEFAULT_CLIENT_STAGES };

export function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function generateLoginCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
