import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { PDFDocument, rgb } from "pdf-lib";
import { DATA_DIR } from "./storagePaths.js";

const CONTRACTS_DIR = path.join(DATA_DIR, "contracts");
const SIGNED_DIR = path.join(CONTRACTS_DIR, "signed");

export function generateSignToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function ensureTicketSignToken(ticket) {
  if (ticket.signToken) return ticket.signToken;
  ticket.signToken = generateSignToken();
  return ticket.signToken;
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], bytes: Buffer.from(match[2], "base64") };
}

function fieldBoxToPdfRect(field, pageWidth, pageHeight) {
  const x = (field.x / 100) * pageWidth;
  const w = (field.width / 100) * pageWidth;
  const h = (field.height / 100) * pageHeight;
  const yTop = (field.y / 100) * pageHeight;
  const y = pageHeight - yTop - h;
  return { x, y, w, h };
}

async function loadTemplatePdfBytes(templateId) {
  try {
    return await fs.readFile(path.join(CONTRACTS_DIR, `${templateId}.pdf`));
  } catch {
    return null;
  }
}

async function stampPdfCopy(template, values) {
  const pdfBytes = await loadTemplatePdfBytes(template.id);
  if (!pdfBytes) return null;

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont("Helvetica");
  const fields = template.fields ?? [];

  for (const field of fields) {
    const pageIndex = field.page ?? 0;
    const page = pdfDoc.getPage(pageIndex);
    if (!page) continue;

    const { width: pageWidth, height: pageHeight } = page.getSize();
    const { x, y, w, h } = fieldBoxToPdfRect(field, pageWidth, pageHeight);
    const value = values[field.id];
    if (value == null || value === "") continue;

    if (field.type === "signature") {
      const parsed = parseDataUrl(value);
      if (!parsed?.bytes?.length) continue;
      try {
        const image =
          parsed.mime === "image/jpeg"
            ? await pdfDoc.embedJpg(parsed.bytes)
            : await pdfDoc.embedPng(parsed.bytes);
        page.drawImage(image, { x, y, width: w, height: h });
      } catch {
        // skip invalid signature image
      }
      continue;
    }

    if (field.type === "checkbox") {
      if (value === true || value === "true" || value === "1") {
        page.drawText("X", {
          x: x + w * 0.25,
          y: y + h * 0.15,
          size: Math.min(h * 0.85, 14),
          font,
          color: rgb(0.1, 0.1, 0.2),
        });
      }
      continue;
    }

    const text = String(value);
    const fontSize = Math.min(h * 0.65, 11);
    page.drawText(text, {
      x: x + 2,
      y: y + Math.max(2, (h - fontSize) / 2),
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.2),
      maxWidth: Math.max(w - 4, 8),
    });
  }

  return pdfDoc.save();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSignedHtml(template, ticket, values) {
  const rows = (template.fields ?? [])
    .map((field) => {
      const raw = values[field.id];
      let display = raw == null || raw === "" ? "—" : String(raw);
      if (field.type === "signature" && String(raw).startsWith("data:image")) {
        display = `<img src="${escapeHtml(raw)}" alt="חתימה" style="max-height:80px;max-width:220px;" />`;
      } else if (field.type === "checkbox") {
        display = raw ? "כן" : "לא";
      } else {
        display = escapeHtml(display);
      }
      return `<tr><th>${escapeHtml(field.label || field.type)}</th><td>${display}</td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(template.name)} — עותק חתום</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #111; }
    h1 { font-size: 1.35rem; margin-bottom: 0.25rem; }
    .meta { color: #555; font-size: 0.9rem; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: right; vertical-align: top; }
    th { background: #f5f5f5; width: 30%; }
  </style>
</head>
<body>
  <h1>${escapeHtml(template.name)}</h1>
  <p class="meta">מזהה חוזה: ${escapeHtml(ticket.id)} · נחתם: ${escapeHtml(ticket.signedAt ?? "")}</p>
  <table>${rows}</table>
</body>
</html>`;
}

/** Saves JSON + HTML (+ PDF when template is PDF). Returns primary download filename. */
export async function saveSignedContractCopy(ticket, template, values) {
  await fs.mkdir(SIGNED_DIR, { recursive: true });
  const base = ticket.id;

  const record = {
    ticketId: ticket.id,
    clientId: ticket.clientId,
    templateId: ticket.templateId,
    templateName: template.name,
    signedAt: ticket.signedAt,
    values,
  };

  await fs.writeFile(path.join(SIGNED_DIR, `${base}.json`), JSON.stringify(record, null, 2), "utf8");

  const html = renderSignedHtml(template, ticket, values);
  await fs.writeFile(path.join(SIGNED_DIR, `${base}.html`), html, "utf8");

  let primary = `${base}.html`;

  if ((template.sourceType || "docx") === "pdf") {
    try {
      const stamped = await stampPdfCopy(template, values);
      if (stamped) {
        await fs.writeFile(path.join(SIGNED_DIR, `${base}.pdf`), stamped);
        primary = `${base}.pdf`;
      }
    } catch (err) {
      console.error("Failed to generate signed PDF copy:", err);
    }
  }

  return primary;
}

export async function readSignedCopyFile(ticketId, format = "auto") {
  const candidates =
    format === "json"
      ? [`${ticketId}.json`]
      : format === "html"
        ? [`${ticketId}.html`]
        : format === "pdf"
          ? [`${ticketId}.pdf`]
          : [`${ticketId}.pdf`, `${ticketId}.html`, `${ticketId}.json`];

  for (const name of candidates) {
    try {
      const data = await fs.readFile(path.join(SIGNED_DIR, name));
      const ext = name.split(".").pop();
      return { data, filename: name, ext };
    } catch {
      // try next
    }
  }
  return null;
}

export function findTicketBySignToken(contracts, signToken) {
  if (!signToken) return null;
  return contracts.tickets.find((t) => t.signToken === signToken) ?? null;
}
