import { DEFAULT_FORM_SCHEMA } from "./defaultFormSchema";
import { feedbackStorageKey } from "./trackFeedbackStorage";

const CLIENTS_KEY = "kramer-music-clients-v1";
const SCHEMA_KEY = "kramer-music-form-schema-v1";

function readLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function collectLocalFeedback(clientIds) {
  const feedback = {};
  for (const clientId of clientIds) {
    const blob = readLocalJson(feedbackStorageKey(clientId), null);
    if (blob) feedback[clientId] = blob;
  }
  return feedback;
}

export function getLocalClients() {
  return readLocalJson(CLIENTS_KEY, []);
}

export function getLocalFormSchema() {
  return readLocalJson(SCHEMA_KEY, null);
}

export function clearMigratedLocalStorage(clientIds) {
  localStorage.removeItem(CLIENTS_KEY);
  localStorage.removeItem(SCHEMA_KEY);
  for (const id of clientIds) {
    localStorage.removeItem(feedbackStorageKey(id));
  }
}

export function shouldMigrateLocalStorage() {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export async function migrateLocalStorageToServer({
  fetchClients,
  saveClients,
  fetchFormSchema,
  saveFormSchema,
  fetchFeedback,
  saveFeedback,
}) {
  const localClients = getLocalClients();
  const localSchema = getLocalFormSchema();
  const serverClients = await fetchClients().catch(() => []);
  const serverSchema = await fetchFormSchema().catch(() => null);
  const serverFeedback = await fetchFeedback().catch(() => ({}));

  let migrated = false;

  if (localClients.length > 0 && serverClients.length === 0) {
    await saveClients(localClients);
    migrated = true;
  }

  if (localSchema?.steps?.length && !serverSchema?.steps?.length) {
    await saveFormSchema(localSchema);
    migrated = true;
  }

  const clientIds = localClients.map((c) => c.id);
  const localFeedback = collectLocalFeedback(clientIds);
  for (const [clientId, data] of Object.entries(localFeedback)) {
    if (!serverFeedback[clientId]) {
      await saveFeedback(clientId, data);
      migrated = true;
    }
  }

  if (migrated) {
    clearMigratedLocalStorage(clientIds);
  }

  return migrated;
}

export { DEFAULT_FORM_SCHEMA };
