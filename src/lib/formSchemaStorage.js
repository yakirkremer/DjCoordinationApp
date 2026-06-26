import { DEFAULT_FORM_SCHEMA } from "./defaultFormSchema";
import { fetchFormSchema, saveFormSchema as saveFormSchemaApi } from "./api/dataApi";

const SCHEMA_KEY = "kramer-music-form-schema-v1";

function normalizeSchema(parsed) {
  if (!parsed?.steps?.length) return structuredClone(DEFAULT_FORM_SCHEMA);
  return {
    version: parsed.version ?? 1,
    steps: parsed.steps.map((step) => ({
      ...step,
      audience: step.audience ?? "all",
      questions: (Array.isArray(step.questions) ? step.questions : []).map((q) => ({
        ...q,
        audience: q.audience ?? "all",
      })),
    })),
  };
}

export async function loadFormSchema() {
  try {
    const parsed = await fetchFormSchema();
    if (!parsed) return structuredClone(DEFAULT_FORM_SCHEMA);
    return normalizeSchema(parsed);
  } catch {
    return structuredClone(DEFAULT_FORM_SCHEMA);
  }
}

export async function saveFormSchema(schema) {
  try {
    await saveFormSchemaApi(schema);
  } catch (err) {
    console.error("Failed to save form schema:", err);
    throw err;
  }
}

export async function resetFormSchema() {
  const fresh = structuredClone(DEFAULT_FORM_SCHEMA);
  await saveFormSchema(fresh);
  return fresh;
}

// Legacy sync helper for tests — prefer loadFormSchema()
export function loadFormSchemaSync() {
  try {
    const raw = localStorage.getItem(SCHEMA_KEY);
    if (!raw) return structuredClone(DEFAULT_FORM_SCHEMA);
    return normalizeSchema(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_FORM_SCHEMA);
  }
}
