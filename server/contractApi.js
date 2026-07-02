import fs from "fs/promises";
import path from "path";
import { parseMultipart, readRequestBody } from "./parseMultipart.js";
import { readJsonFile, writeJsonFile, sendJson } from "./dataStore.js";
import { isAdminSession, isAuthenticatedSession, parseRequestSession } from "./auth.js";
import { DATA_DIR } from "./storagePaths.js";
import { docxBufferToHtml } from "./docxToHtml.js";
import {
  mergeSignedContractValues,
  validateClientContractValues,
} from "../src/lib/contractFields.js";

export const CONTRACTS_FILE = "contracts.json";
const CONTRACTS_DIR = path.join(DATA_DIR, "contracts");
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const EMPTY_CONTRACTS = { templates: [], tickets: [] };

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function readContracts() {
  const data = await readJsonFile(CONTRACTS_FILE, EMPTY_CONTRACTS);
  return {
    templates: Array.isArray(data.templates) ? data.templates : [],
    tickets: Array.isArray(data.tickets) ? data.tickets : [],
  };
}

export async function writeContracts(data) {
  await writeJsonFile(CONTRACTS_FILE, {
    templates: Array.isArray(data.templates) ? data.templates : [],
    tickets: Array.isArray(data.tickets) ? data.tickets : [],
  });
}

function publicTemplate(template) {
  if (!template) return null;
  const base = {
    id: template.id,
    name: template.name,
    sourceType: template.sourceType || "docx",
    fields: template.fields ?? [],
  };
  if (base.sourceType === "pdf") {
    return { ...base, fileUrl: `/api/contracts/templates/${template.id}/file` };
  }
  return { ...base, html: template.html };
}

function publicTicket(ticket, template) {
  return {
    id: ticket.id,
    clientId: ticket.clientId,
    templateId: ticket.templateId,
    status: ticket.status,
    sentAt: ticket.sentAt,
    signedAt: ticket.signedAt ?? null,
    values: ticket.values ?? {},
    template: publicTemplate(template),
  };
}

async function canAccessTemplateFile(session, templateId) {
  if (isAdminSession(session)) return true;
  if (session?.role === "client" && session.clientId) {
    const contracts = await readContracts();
    const ticket = contracts.tickets.find((t) => t.clientId === session.clientId);
    return ticket?.templateId === templateId;
  }
  return false;
}

export async function handleContractUpload(req, res) {
  const session = parseRequestSession(req);
  if (!isAdminSession(session)) {
    sendJson(res, 403, { error: "Admin access required" });
    return;
  }

  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(.+)$/i);
  if (!boundaryMatch) {
    sendJson(res, 400, { error: "Expected multipart form data" });
    return;
  }

  let buffer;
  try {
    buffer = await readRequestBody(req, MAX_FILE_BYTES);
  } catch (err) {
    sendJson(res, 413, { error: err.message || "Upload too large" });
    return;
  }

  const parts = parseMultipart(buffer, boundaryMatch[1].trim());
  const fields = {};
  let filePart = null;

  for (const part of parts) {
    if (!part.name) continue;
    if (part.filename) {
      filePart = part;
    } else {
      fields[part.name] = part.data.toString("utf8").trim();
    }
  }

  if (!filePart?.data?.length) {
    sendJson(res, 400, { error: "No file provided" });
    return;
  }

  const filename = filePart.filename || "contract.docx";
  const lower = filename.toLowerCase();
  const isPdf = lower.endsWith(".pdf");
  const isDocx = lower.endsWith(".docx");

  if (!isPdf && !isDocx) {
    sendJson(res, 400, { error: "Only .pdf and .docx files are supported" });
    return;
  }

  if (filePart.data.length > MAX_FILE_BYTES) {
    sendJson(res, 413, { error: "File too large (max 15MB)" });
    return;
  }

  if (isPdf && filePart.data.slice(0, 5).toString() !== "%PDF-") {
    sendJson(res, 400, { error: "Invalid PDF file" });
    return;
  }

  try {
    const templateId = generateId("tpl");
    await fs.mkdir(CONTRACTS_DIR, { recursive: true });

    let template;
    if (isPdf) {
      await fs.writeFile(path.join(CONTRACTS_DIR, `${templateId}.pdf`), filePart.data);
      template = {
        id: templateId,
        name: fields.name || filename.replace(/\.pdf$/i, ""),
        sourceType: "pdf",
        fields: [],
        createdAt: new Date().toISOString(),
      };
    } else {
      const html = await docxBufferToHtml(filePart.data);
      await fs.writeFile(path.join(CONTRACTS_DIR, `${templateId}.docx`), filePart.data);
      template = {
        id: templateId,
        name: fields.name || filename.replace(/\.docx$/i, ""),
        sourceType: "docx",
        html,
        fields: [],
        createdAt: new Date().toISOString(),
      };
    }

    const contracts = await readContracts();
    contracts.templates.push(template);
    await writeContracts(contracts);

    sendJson(res, 201, { template });
  } catch (err) {
    sendJson(res, 400, { error: err.message || "Failed to process upload" });
  }
}

export async function handleContractsApi(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith("/api/contracts")) return false;

  const session = parseRequestSession(req);
  const subPath = url.pathname.slice("/api/contracts".length) || "/";

  try {
    if (subPath === "/upload" && req.method === "POST") {
      await handleContractUpload(req, res);
      return true;
    }

    if (subPath === "" || subPath === "/") {
      if (req.method === "GET") {
        const contracts = await readContracts();

        if (isAdminSession(session)) {
          sendJson(res, 200, contracts);
          return true;
        }

        if (session?.role === "client" && session.clientId) {
          const ticket = contracts.tickets.find((t) => t.clientId === session.clientId);
          if (!ticket) {
            sendJson(res, 200, { ticket: null });
            return true;
          }
          const template = contracts.templates.find((t) => t.id === ticket.templateId);
          sendJson(res, 200, { ticket: publicTicket(ticket, template) });
          return true;
        }

        sendJson(res, 401, { error: "Login required" });
        return true;
      }

      if (req.method === "PUT") {
        if (!isAdminSession(session)) {
          sendJson(res, 403, { error: "Admin access required" });
          return true;
        }

        let body = "";
        await new Promise((resolve, reject) => {
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", resolve);
          req.on("error", reject);
        });

        const parsed = JSON.parse(body);
        await writeContracts(parsed);
        sendJson(res, 200, { ok: true });
        return true;
      }
    }

    const fileMatch = subPath.match(/^\/templates\/([^/]+)\/file$/);
    if (fileMatch && req.method === "GET") {
      if (!isAuthenticatedSession(session)) {
        sendJson(res, 401, { error: "Login required" });
        return true;
      }

      const templateId = fileMatch[1];
      if (!(await canAccessTemplateFile(session, templateId))) {
        sendJson(res, 403, { error: "Forbidden" });
        return true;
      }

      const contracts = await readContracts();
      const template = contracts.templates.find((t) => t.id === templateId);
      if (!template) {
        sendJson(res, 404, { error: "Template not found" });
        return true;
      }

      const sourceType = template.sourceType || "docx";
      const preferredExt = sourceType === "pdf" ? "pdf" : "docx";
      const alternateExt = preferredExt === "pdf" ? "docx" : "pdf";
      let fileData = null;
      let ext = preferredExt;

      for (const tryExt of [preferredExt, alternateExt]) {
        const tryPath = path.join(CONTRACTS_DIR, `${templateId}.${tryExt}`);
        try {
          fileData = await fs.readFile(tryPath);
          ext = tryExt;
          break;
        } catch {
          // try next extension
        }
      }

      if (!fileData) {
        sendJson(res, 404, {
          error: "Contract file not found — re-upload the PDF or DOCX template",
        });
        return true;
      }

      try {
        res.statusCode = 200;
        res.setHeader(
          "Content-Type",
          ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        res.setHeader("Cache-Control", "private, max-age=3600");
        res.end(fileData);
      } catch (err) {
        sendJson(res, 500, { error: err.message || "Failed to read contract file" });
      }
      return true;
    }

    const signMatch = subPath.match(/^\/tickets\/([^/]+)\/sign$/);
    if (signMatch && req.method === "PUT") {
      if (!isAuthenticatedSession(session)) {
        sendJson(res, 401, { error: "Login required" });
        return true;
      }

      let body = "";
      await new Promise((resolve, reject) => {
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", resolve);
        req.on("error", reject);
      });

      const { values } = JSON.parse(body);
      const ticketId = signMatch[1];
      const contracts = await readContracts();
      const ticket = contracts.tickets.find((t) => t.id === ticketId);

      if (!ticket) {
        sendJson(res, 404, { error: "Contract ticket not found" });
        return true;
      }

      if (!isAdminSession(session) && session.clientId !== ticket.clientId) {
        sendJson(res, 403, { error: "Forbidden" });
        return true;
      }

      if (ticket.status === "signed") {
        sendJson(res, 400, { error: "Contract already signed" });
        return true;
      }

      const template = contracts.templates.find((t) => t.id === ticket.templateId);
      if (!template) {
        sendJson(res, 404, { error: "Contract template not found" });
        return true;
      }

      const mergedValues = mergeSignedContractValues(template.fields ?? [], values ?? {});
      if (!isAdminSession(session)) {
        const validationError = validateClientContractValues(template.fields ?? [], values ?? {});
        if (validationError) {
          sendJson(res, 400, { error: validationError });
          return true;
        }
      }

      ticket.values = mergedValues;
      ticket.status = "signed";
      ticket.signedAt = new Date().toISOString();
      await writeContracts(contracts);

      sendJson(res, 200, { ok: true, ticket: publicTicket(ticket, template) });
      return true;
    }

    sendJson(res, 404, { error: "Not found" });
    return true;
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Server error" });
    return true;
  }
}

export function createContractApiMiddleware() {
  return (req, res, next) => {
    handleContractsApi(req, res).then((handled) => {
      if (!handled) next();
    });
  };
}

export async function deleteClientContractTicket(clientId) {
  const contracts = await readContracts();
  const before = contracts.tickets.length;
  contracts.tickets = contracts.tickets.filter((t) => t.clientId !== clientId);
  if (contracts.tickets.length !== before) {
    await writeContracts(contracts);
  }
}
