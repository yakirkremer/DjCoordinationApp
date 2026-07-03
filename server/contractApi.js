import fs from "fs/promises";
import path from "path";
import { parseMultipart, readRequestBody } from "./parseMultipart.js";
import { readJsonFile, writeJsonFile, sendJson, DATA_FILES } from "./dataStore.js";
import { isAdminSession, isAuthenticatedSession, parseRequestSession } from "./auth.js";
import { DATA_DIR } from "./storagePaths.js";
import { docxBufferToHtml } from "./docxToHtml.js";
import {
  mergeSignedContractValues,
  validateClientContractValues,
  patchAdminTicketValues,
  buildTicketValuesWithClientDetails,
} from "../src/lib/contractFields.js";
import { buildClientDetailsSnapshot } from "../src/lib/clientDetails.js";
import {
  dedupeTicketsByClient,
  pickCanonicalTicketForClient,
  findTicketBySignToken,
} from "../src/lib/contractTickets.js";
import {
  ensureTicketSignToken,
  readSignedCopyFile,
  saveSignedContractCopy,
  ensureSignedPdfCopy,
} from "./contractSignedCopy.js";

export const CONTRACTS_FILE = "contracts.json";
const CONTRACTS_DIR = path.join(DATA_DIR, "contracts");
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const EMPTY_CONTRACTS = { templates: [], tickets: [] };

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function loadClientDetailsForSync(clientId, clientProfile = {}) {
  const clients = await readJsonFile(DATA_FILES.clients, []);
  const stored = clients.find((c) => c.id === clientId) ?? null;
  const client = stored ?? {
    name: clientProfile.clientName ?? "",
    eventDate: clientProfile.eventDate ?? "",
    eventLocation: clientProfile.eventLocation ?? "",
  };
  const feedbackAll = await readJsonFile(DATA_FILES.feedback, {});
  const feedbackEntry = feedbackAll[clientId] ?? null;
  const preferences = feedbackEntry?.preferences ?? feedbackEntry ?? null;
  return buildClientDetailsSnapshot(client, preferences);
}

export async function readContracts() {
  const data = await readJsonFile(CONTRACTS_FILE, EMPTY_CONTRACTS);
  return {
    templates: Array.isArray(data.templates) ? data.templates : [],
    tickets: dedupeTicketsByClient(Array.isArray(data.tickets) ? data.tickets : []),
  };
}

export async function writeContracts(data) {
  await writeJsonFile(CONTRACTS_FILE, {
    templates: Array.isArray(data.templates) ? data.templates : [],
    tickets: dedupeTicketsByClient(Array.isArray(data.tickets) ? data.tickets : []),
  });
}

function publicTemplate(template) {
  if (!template) return null;
  const base = {
    id: template.id,
    name: template.name,
    sourceType: template.sourceType || "docx",
    fields: template.fields ?? [],
    detailSync: template.detailSync ?? {},
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
    signToken: ticket.signToken ?? null,
    signedCopyFile: ticket.signedCopyFile ?? null,
    template: publicTemplate(template),
  };
}

async function ensureAllTicketTokens(contracts) {
  let changed = false;
  for (const ticket of contracts.tickets) {
    if (!ticket.signToken) {
      ensureTicketSignToken(ticket);
      changed = true;
    }
  }
  if (changed) await writeContracts(contracts);
  return contracts;
}

async function finalizeTicketSign(ticket, template, rawValues, { isClient = true } = {}) {
  const mergedValues = mergeSignedContractValues(template.fields ?? [], rawValues ?? {}, ticket.values ?? {});
  if (isClient) {
    const validationError = validateClientContractValues(template.fields ?? [], rawValues ?? {}, ticket.values ?? {});
    if (validationError) {
      return { error: validationError, status: 400 };
    }
  }

  ticket.values = mergedValues;
  ticket.status = "signed";
  ticket.signedAt = new Date().toISOString();
  ticket.signedCopyFile = await saveSignedContractCopy(ticket, template, mergedValues);
  return { ticket, mergedValues };
}

async function canAccessTemplateFile(session, templateId, signToken) {
  if (signToken) {
    const contracts = await readContracts();
    const ticket = findTicketBySignToken(contracts.tickets, signToken);
    return ticket?.templateId === templateId;
  }
  if (isAdminSession(session)) return true;
  if (session?.role === "client" && session.clientId) {
    const contracts = await readContracts();
    const ticket = pickCanonicalTicketForClient(contracts.tickets, session.clientId);
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
          await ensureAllTicketTokens(contracts);
          sendJson(res, 200, contracts);
          return true;
        }

        if (session?.role === "client" && session.clientId) {
          const ticket = pickCanonicalTicketForClient(contracts.tickets, session.clientId);
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
      const templateId = fileMatch[1];
      const signToken = url.searchParams.get("signToken")?.trim() || null;
      if (!signToken && !isAuthenticatedSession(session)) {
        sendJson(res, 401, { error: "Login required" });
        return true;
      }

      if (!(await canAccessTemplateFile(session, templateId, signToken))) {
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

    const linkMatch = subPath.match(/^\/link\/([^/]+)$/);
    if (linkMatch && req.method === "GET") {
      const signToken = decodeURIComponent(linkMatch[1]);
      let contracts = await readContracts();
      await ensureAllTicketTokens(contracts);
      contracts = await readContracts();
      const ticket = findTicketBySignToken(contracts.tickets, signToken);
      if (!ticket) {
        sendJson(res, 404, { error: "Contract link not found or expired" });
        return true;
      }
      const template = contracts.templates.find((t) => t.id === ticket.templateId);
      if (!template) {
        sendJson(res, 404, { error: "Contract template not found" });
        return true;
      }
      sendJson(res, 200, { ticket: publicTicket(ticket, template) });
      return true;
    }

    const ticketsMatch = subPath === "/tickets";
    if (ticketsMatch && req.method === "POST") {
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

      const { clientId, templateId, clientProfile } = JSON.parse(body || "{}");
      if (!clientId || !templateId) {
        sendJson(res, 400, { error: "clientId and templateId are required" });
        return true;
      }

      const contracts = await readContracts();
      const template = contracts.templates.find((t) => t.id === templateId);
      if (!template) {
        sendJson(res, 404, { error: "Contract template not found" });
        return true;
      }

      let ticket = pickCanonicalTicketForClient(contracts.tickets, clientId);
      const fields = template.fields ?? [];
      const clientDetails = await loadClientDetailsForSync(clientId, clientProfile ?? {});

      if (ticket) {
        if (ticket.status === "signed") {
          sendJson(res, 400, { error: "Client already signed this contract" });
          return true;
        }
        ticket.templateId = templateId;
        ticket.values = buildTicketValuesWithClientDetails(
          fields,
          ticket.values ?? {},
          clientDetails,
          {},
          { onlyEmpty: false }
        );
        ensureTicketSignToken(ticket);
      } else {
        ticket = {
          id: generateId("ticket"),
          clientId,
          templateId,
          status: "pending",
          sentAt: new Date().toISOString(),
          signedAt: null,
          values: buildTicketValuesWithClientDetails(fields, {}, clientDetails, {}, {
            onlyEmpty: false,
          }),
          signToken: null,
          signedCopyFile: null,
        };
        ensureTicketSignToken(ticket);
        contracts.tickets.push(ticket);
      }

      contracts.tickets = dedupeTicketsByClient(contracts.tickets);
      await writeContracts(contracts);
      sendJson(res, 200, { ticket: publicTicket(ticket, template) });
      return true;
    }

    const linkSignMatch = subPath.match(/^\/link\/([^/]+)\/sign$/);
    if (linkSignMatch && req.method === "PUT") {
      let body = "";
      await new Promise((resolve, reject) => {
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", resolve);
        req.on("error", reject);
      });

      const { values } = JSON.parse(body || "{}");
      const signToken = decodeURIComponent(linkSignMatch[1]);
      const contracts = await readContracts();
      const ticket = findTicketBySignToken(contracts.tickets, signToken);

      if (!ticket) {
        sendJson(res, 404, { error: "Contract link not found" });
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

      const result = await finalizeTicketSign(ticket, template, values, { isClient: true });
      if (result.error) {
        sendJson(res, result.status, { error: result.error });
        return true;
      }

      await writeContracts(contracts);
      sendJson(res, 200, { ok: true, ticket: publicTicket(ticket, template) });
      return true;
    }

    const ticketSyncMatch = subPath.match(/^\/tickets\/([^/]+)\/sync-client$/);
    if (ticketSyncMatch && req.method === "PUT") {
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

      const { detailSync: _legacyDetailSync } = JSON.parse(body || "{}");
      const ticketId = ticketSyncMatch[1];
      const contracts = await readContracts();
      const ticket = contracts.tickets.find((t) => t.id === ticketId);

      if (!ticket) {
        sendJson(res, 404, { error: "Contract ticket not found" });
        return true;
      }

      if (ticket.status === "signed") {
        sendJson(res, 400, { error: "Cannot edit a signed contract" });
        return true;
      }

      const template = contracts.templates.find((t) => t.id === ticket.templateId);
      if (!template) {
        sendJson(res, 404, { error: "Contract template not found" });
        return true;
      }

      const clientDetails = await loadClientDetailsForSync(ticket.clientId, {});
      const fields = template.fields ?? [];
      ticket.values = buildTicketValuesWithClientDetails(
        fields,
        ticket.values ?? {},
        clientDetails,
        template.detailSync ?? {},
        { onlyEmpty: false }
      );

      await writeContracts(contracts);
      sendJson(res, 200, { ok: true, ticket: publicTicket(ticket, template) });
      return true;
    }

    const ticketValuesMatch = subPath.match(/^\/tickets\/([^/]+)\/values$/);
    if (ticketValuesMatch && req.method === "PUT") {
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

      const { values: adminPatch } = JSON.parse(body || "{}");
      const ticketId = ticketValuesMatch[1];
      const contracts = await readContracts();
      const ticket = contracts.tickets.find((t) => t.id === ticketId);

      if (!ticket) {
        sendJson(res, 404, { error: "Contract ticket not found" });
        return true;
      }

      if (ticket.status === "signed") {
        sendJson(res, 400, { error: "Cannot edit a signed contract" });
        return true;
      }

      const template = contracts.templates.find((t) => t.id === ticket.templateId);
      if (!template) {
        sendJson(res, 404, { error: "Contract template not found" });
        return true;
      }

      ticket.values = patchAdminTicketValues(template.fields ?? [], ticket.values ?? {}, adminPatch ?? {});
      await writeContracts(contracts);
      sendJson(res, 200, { ok: true, ticket: publicTicket(ticket, template) });
      return true;
    }

    const copyMatch = subPath.match(/^\/tickets\/([^/]+)\/copy$/);
    if (copyMatch && req.method === "GET") {
      const ticketId = copyMatch[1];
      const signToken = url.searchParams.get("signToken")?.trim() || null;
      const format = url.searchParams.get("format") || "auto";
      const contracts = await readContracts();
      const ticket = contracts.tickets.find((t) => t.id === ticketId);

      if (!ticket) {
        sendJson(res, 404, { error: "Signed copy not found" });
        return true;
      }

      const allowedByAdmin = isAdminSession(session);
      const allowedByClient =
        session?.role === "client" && session.clientId === ticket.clientId;
      const allowedByLink =
        signToken && findTicketBySignToken(contracts.tickets, signToken)?.id === ticketId;

      if (!allowedByAdmin && !allowedByClient && !allowedByLink) {
        sendJson(res, 403, { error: "Forbidden" });
        return true;
      }

      const template = contracts.templates.find((t) => t.id === ticket.templateId);
      if ((format === "pdf" || format === "auto") && ticket.status === "signed" && template) {
        await ensureSignedPdfCopy(ticket, template);
      }

      const file = await readSignedCopyFile(ticketId, format);
      if (!file) {
        sendJson(res, 404, { error: "Signed copy not found" });
        return true;
      }

      const types = {
        pdf: "application/pdf",
        html: "text/html; charset=utf-8",
        json: "application/json",
      };
      res.statusCode = 200;
      res.setHeader("Content-Type", types[file.ext] || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
      res.end(file.data);
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

      const result = await finalizeTicketSign(ticket, template, values, {
        isClient: !isAdminSession(session),
      });
      if (result.error) {
        sendJson(res, result.status, { error: result.error });
        return true;
      }

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
