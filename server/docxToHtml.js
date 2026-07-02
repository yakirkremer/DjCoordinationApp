import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractParagraphs(xml) {
  const paragraphs = [];
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let match;
  while ((match = pRegex.exec(xml)) !== null) {
    paragraphs.push(match[1]);
  }
  return paragraphs;
}

function paragraphToHtml(pXml) {
  if (/<w:tbl\b/.test(pXml)) return null;

  const parts = [];
  const runRegex = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
  let runMatch;
  let hasContent = false;

  while ((runMatch = runRegex.exec(pXml)) !== null) {
    const run = runMatch[1];
    const bold = /<w:b\b[^>]*\/>/.test(run) || /<w:b\b[^>]*>/.test(run);
    const texts = [...run.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
    if (/<w:br\b/.test(run)) {
      parts.push("<br/>");
      hasContent = true;
    }
    if (texts.length) {
      const text = escapeHtml(texts.join(""));
      parts.push(bold ? `<strong>${text}</strong>` : text);
      hasContent = true;
    }
  }

  if (!hasContent) {
    const fallback = [...pXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
    if (!fallback.length) return "";
    return `<p>${escapeHtml(fallback.join(""))}</p>`;
  }

  return `<p>${parts.join("")}</p>`;
}

function extractTables(xml) {
  const tables = [];
  const tblRegex = /<w:tbl\b[^>]*>([\s\S]*?)<\/w:tbl>/g;
  let match;
  while ((match = tblRegex.exec(xml)) !== null) {
    tables.push(match[1]);
  }
  return tables;
}

function tableToHtml(tblXml) {
  const rows = [...tblXml.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)];
  const htmlRows = rows.map((row) => {
    const cells = [...row[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)];
    const htmlCells = cells.map((cell) => {
      const inner = extractParagraphs(cell[1])
        .map(paragraphToHtml)
        .filter(Boolean)
        .join("");
      return `<td>${inner || "&nbsp;"}</td>`;
    });
    return `<tr>${htmlCells.join("")}</tr>`;
  });
  return `<table class="contract-table">${htmlRows.join("")}</table>`;
}

function ooxmlToHtml(xml) {
  const bodyMatch = xml.match(/<w:body\b[^>]*>([\s\S]*?)<\/w:body>/);
  const body = bodyMatch?.[1] ?? xml;

  const blocks = [];
  let lastIndex = 0;

  const tblRegex = /<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/g;
  let tblMatch;
  while ((tblMatch = tblRegex.exec(body)) !== null) {
    const before = body.slice(lastIndex, tblMatch.index);
    extractParagraphs(before).forEach((p) => {
      const html = paragraphToHtml(p);
      if (html) blocks.push(html);
    });
    blocks.push(tableToHtml(tblMatch[0]));
    lastIndex = tblMatch.index + tblMatch[0].length;
  }

  const tail = body.slice(lastIndex);
  extractParagraphs(tail).forEach((p) => {
    const html = paragraphToHtml(p);
    if (html) blocks.push(html);
  });

  return `<div class="contract-doc">${blocks.join("\n")}</div>`;
}

export async function docxBufferToHtml(buffer) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "km-docx-"));
  const docxPath = path.join(tmpDir, "input.docx");
  const extractDir = path.join(tmpDir, "extract");

  try {
    await fs.writeFile(docxPath, buffer);
    await fs.mkdir(extractDir, { recursive: true });
    await execFileAsync("unzip", ["-q", "-o", docxPath, "-d", extractDir]);
    const xmlPath = path.join(extractDir, "word", "document.xml");
    const xml = await fs.readFile(xmlPath, "utf8");
    return ooxmlToHtml(xml);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
