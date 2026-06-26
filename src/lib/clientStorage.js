import { normalizeClientType } from "./clientTypes";

export function normalizeClient(client) {
  return {
    ...client,
    clientType: normalizeClientType(client.clientType),
  };
}

export function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function generateLoginCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
